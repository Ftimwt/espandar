package controllers

import (
	"espandar/models"

	"log"

	"github.com/googollee/go-socket.io"
	"github.com/pion/webrtc/v3"
)

var PeerConnections = make(map[string]*webrtc.PeerConnection)

func HandleOffer(socket socketio.Conn, offer models.OfferMessage) {
	log.Printf("handling offer from user %d: %+v\n", offer.ReceiverID, offer)

	pc, err := webrtc.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		log.Println("failed to create peer connection:", err)
		return
	}

	pc.OnICECandidate(func(candidate *webrtc.ICECandidate) {
		if candidate != nil {
			socket.Emit("ice_candidate", models.ICECandidate{
				ReceiverID: offer.ReceiverID,
				Candidate:  candidate.ToJSON().Candidate,
			})
		}
	})

	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		log.Printf("track received: %s, kind:%s\n", track.ID(), track.Kind())

		go func() {
			if track.Kind() == webrtc.RTPCodecTypeVideo {
				log.Println("video track received")

				for {
					packet := make([]byte, 1500)
					n, err := track.Read(packet)
					if err != nil {
						log.Println("error reading video track:", err)
						break
					}

					codec := track.Codec()
					payloadType := codec.PayloadType
					mimeType := codec.MimeType

					log.Printf("received packet of size %d with payload type %d", n, payloadType, mimeType)

					socket.Emit("video_packet", packet[:n])
				}
			} else if track.Kind() == webrtc.RTPCodecTypeAudio {
				log.Panicln("audio track received")

				for {
					packet := make([]byte, 1500)
					n, err := track.Read(packet)
					if err != nil {
						log.Println("error reading audio track:", err)
						break
					}

					codec := track.Codec()
					payloadType := codec.PayloadType
					mimeType := codec.MimeType

					log.Printf("received packet of size %d with payload type %d", n, payloadType, mimeType)

					socket.Emit("audio_packet", packet[:n])
				}
			}
		}()
	})

	err = pc.SetRemoteDescription(webrtc.SessionDescription{Type: webrtc.SDPTypeOffer, SDP: offer.Offer})
	if err != nil {
		log.Println("failed to set remote description:", err)
		return
	}

	answerOptions := webrtc.AnswerOptions{}
	answer, err := pc.CreateAnswer(&answerOptions)
	if err != nil {
		log.Println("failed to create answer:", err)
		return
	}

	err = pc.SetLocalDescription(answer)
	if err != nil {
		log.Println("failed to set local description:", err)
		return
	}

	socket.Emit("answer", models.AnswerMessage{
		ReceiverID: offer.ReceiverID,
		Answer:     answer.SDP,
	})

	PeerConnections[socket.ID()] = pc
}

func HandleAnswer(socket socketio.Conn, answer models.AnswerMessage) {
	log.Printf("handling answer from user %d: %+v\n", answer.ReceiverID, answer)

	pc := PeerConnections[socket.ID()]
	if pc == nil {
		log.Println("peerconnection not found for user:", socket.ID())
		return
	}

	err := pc.SetRemoteDescription(webrtc.SessionDescription{Type: webrtc.SDPTypeAnswer, SDP: answer.Answer})
	if err != nil {
		log.Println("failed to set remote description:", err)
		return
	}
}

func HandleICECandidate(socket socketio.Conn, candidate models.ICECandidate) {
	log.Printf("handling ICE candidate from user %d: %+v\n", candidate.ReceiverID, candidate)

	pc := PeerConnections[socket.ID()]
	if pc == nil {
		log.Println("peerconnection not found for user:", socket.ID())
		return
	}

	err := pc.AddICECandidate(webrtc.ICECandidateInit{
		Candidate: candidate.Candidate,
	})
	if err != nil {
		log.Println("failed to add ICE candidate:", err)
	}
}
