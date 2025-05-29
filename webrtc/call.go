package webrtc

import (
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v3"
)

func (r *Room) ConnectRoom(sender MessageSender, userData UserConnData) {
	peerConnection, err := webrtc.NewPeerConnection(r.config)
	if err != nil {
		log.Printf("ConnectRoom: Creating peer connection error: %v", err)
		return
	}

	codecs := []webrtc.RTPCodecType{webrtc.RTPCodecTypeAudio}
	if userData.CallType == "video" {
		codecs = append(codecs, webrtc.RTPCodecTypeVideo)

		for _, typ := range codecs {
			if _, err := peerConnection.AddTransceiverFromKind(typ, webrtc.RTPTransceiverInit{
				Direction: webrtc.RTPTransceiverDirectionSendrecv,
			}); err != nil {
				log.Printf("ConnectRoom: Error adding transceiver %d: %v", typ, err)
				return
			}
		}

		peer := &Peer{
			ID:             userData.MemberID,
			PeerConnection: peerConnection,
			Room:           r,
			UserData:       userData,
			Sender:         sender,
		}
		r.AddPeer(peer)

		peerConnection.OnICECandidate(func(i *webrtc.ICECandidate) {
			if i == nil {
				return
			}
			candidate, _ := json.Marshal(i.ToJSON())
			log.Printf("ConnectRoom: Sending candidate for %s: %s", userData.MemberID, candidate)
			peer.Sender.Emit("webrtc_ice_candidate", map[string]interface{}{
				"data": i.ToJSON(),
				"from": userData.MemberID,
			})
		})

		peerConnection.OnConnectionStateChange(func(pcs webrtc.PeerConnectionState) {
			log.Printf("ConnectRoom: Connection state for %s: %s", userData.MemberID, pcs.String())
			if pcs == webrtc.PeerConnectionStateFailed || pcs == webrtc.PeerConnectionStateClosed {
				r.RemovePeer(peer.ID)
				peerConnection.Close()
			}
		})

		peerConnection.OnTrack(func(tr *webrtc.TrackRemote, _ *webrtc.RTPReceiver) {
			log.Printf("OnTrack: New track for user %s, kind: %s, id: %s", userData.MemberID, tr.Kind().String(), tr.ID())
			trackLocal := r.AddTrack(tr, userData.MemberID)
			if trackLocal == nil {
				log.Printf("OnTrack: Failed to create local track for user %s", userData.MemberID)
				return
			}
			defer r.RemoveTrack(trackLocal)
			buf := make([]byte, 1500)
			for {
				i, _, err := tr.Read(buf)
				if err != nil {
					log.Printf("ConnectRoom: Track read error: %v", err)
					return
				}
				if _, err = trackLocal.Write(buf[:i]); err != nil {
					log.Printf("ConnectRoom: Track write error: %v", err)
					return
				}
			}
		})
	}
}
