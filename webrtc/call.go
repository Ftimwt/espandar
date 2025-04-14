package webrtc

import (
	"encoding/json"
	"log"

	"github.com/pion/webrtc/v3"
)

func (r *Room) ConnectRoom(sender MessageSender, userData UserConnData) {
	peerConnection, err := webrtc.NewPeerConnection(r.config)
	if err != nil {
		log.Printf("Creating peer connection error: %v\n", err)
		return
	}

	for _, typ := range []webrtc.RTPCodecType{webrtc.RTPCodecTypeVideo, webrtc.RTPCodecTypeAudio} {
		if _, err := peerConnection.AddTransceiverFromKind(typ, webrtc.RTPTransceiverInit{
			Direction: webrtc.RTPTransceiverDirectionSendrecv,
		}); err != nil {
			log.Printf("Error adding transceiver %d: %v", typ, err)
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
		log.Printf("Sending candidate for %s: %s", userData.MemberID, candidate)
		peer.Sender.Emit("signal", WebsocketMessage{
			Event: "candidate",
			Data:  string(candidate),
		})
	})

	peerConnection.OnConnectionStateChange(func(pcs webrtc.PeerConnectionState) {
		log.Println("Connection state for", userData.MemberID, ":", pcs.String())
		if pcs == webrtc.PeerConnectionStateFailed || pcs == webrtc.PeerConnectionStateClosed {
			r.RemovePeer(peer.ID)
			peerConnection.Close()
		}
	})

	peerConnection.OnTrack(func(tr *webrtc.TrackRemote, _ *webrtc.RTPReceiver) {
		log.Println("New track received for user:", userData.MemberID)
		trackLocal := r.AddTrack(tr, userData.MemberID)
		if trackLocal == nil {
			return
		}
		defer r.RemoveTrack(trackLocal)
		buf := make([]byte, 1500)
		for {
			i, _, err := tr.Read(buf)
			if err != nil {
				log.Println("Track read error:", err)
				return
			}
			if _, err = trackLocal.Write(buf[:i]); err != nil {
				log.Println("Track write error:", err)
				return
			}
		}
	})
}
