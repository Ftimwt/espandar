package webrtc

import (
	"encoding/json"
	"github.com/gofiber/websocket/v2"
	"github.com/pion/webrtc/v3"
	"log"
	"os"
	"sync"
)

func NewRoom(id string) *Room {
	return &Room{
		ID:    id,
		Peers: &Peers{Connections: []PeerConnectionState{}},
	}
}

func GetOrCreateRoom(id string) *Room {
	if room, exists := Rooms[id]; exists {
		return room
	}
	room := NewRoom(id)
	Rooms[id] = room
	return room
}

// ✅ WebSocket handler برای کنفرانس چندنفره
func HandleConferenceWebSocket(c *websocket.Conn) {
	roomId := c.Params("roomId")
	if roomId == "" {
		log.Println("❌ No roomId provided")
		return
	}

	room := GetOrCreateRoom(roomId)
	RoomConn(c, room.Peers)
}

// 🎥 همانند RoomConn قبلی برای مدیریت peerها
func RoomConn(c *websocket.Conn, p *Peers) {
	var config webrtc.Configuration
	if os.Getenv("ENVIRONMENT") == "PRODUCTION" {
		config = turnConfig
	}
	peerConnection, err := webrtc.NewPeerConnection(config)
	if err != nil {
		log.Print(err)
		return
	}
	defer peerConnection.Close()

	for _, typ := range []webrtc.RTPCodecType{webrtc.RTPCodecTypeVideo, webrtc.RTPCodecTypeAudio} {
		if _, err := peerConnection.AddTransceiverFromKind(typ, webrtc.RTPTransceiverInit{
			Direction: webrtc.RTPTransceiverDirectionRecvonly,
		}); err != nil {
			log.Print(err)
			return
		}
	}

	newPeer := PeerConnectionState{
		PeerConnection: peerConnection,
		Websocket: &ThreadSafeWriter{
			Conn:  c,
			Mutex: sync.Mutex{},
		},
	}

	p.ListLock.Lock()
	p.Connections = append(p.Connections, newPeer)
	p.ListLock.Unlock()

	peerConnection.OnICECandidate(func(i *webrtc.ICECandidate) {
		if i == nil {
			return
		}

		candidateString, err := json.Marshal(i.ToJSON())
		if err != nil {
			log.Println(err)
			return
		}

		_ = newPeer.Websocket.WriteJSON(&websocketMessage{
			Event: "candidate",
			Data:  string(candidateString),
		})
	})

	peerConnection.OnConnectionStateChange(func(pp webrtc.PeerConnectionState) {
		if pp == webrtc.PeerConnectionStateFailed || pp == webrtc.PeerConnectionStateClosed {
			_ = peerConnection.Close()
			p.SignalPeerConnections()
		}
	})

	peerConnection.OnTrack(func(t *webrtc.TrackRemote, _ *webrtc.RTPReceiver) {
		trackLocal := p.AddTrack(t)
		if trackLocal == nil {
			return
		}
		defer p.RemoveTrack(trackLocal)

		buf := make([]byte, 1500)
		for {
			i, _, err := t.Read(buf)
			if err != nil {
				return
			}
			if _, err = trackLocal.Write(buf[:i]); err != nil {
				return
			}
		}
	})

	p.SignalPeerConnections()

	message := &websocketMessage{}
	for {
		_, raw, err := c.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		} else if err := json.Unmarshal(raw, &message); err != nil {
			log.Println(err)
			return
		}

		switch message.Event {
		case "candidate":
			candidate := webrtc.ICECandidateInit{}
			_ = json.Unmarshal([]byte(message.Data), &candidate)
			_ = peerConnection.AddICECandidate(candidate)

		case "offer":
			offer := webrtc.SessionDescription{}
			_ = json.Unmarshal([]byte(message.Data), &offer)
			_ = peerConnection.SetRemoteDescription(offer)

			offerAnswer, err := peerConnection.CreateAnswer(nil)
			if err != nil {
				log.Println(err)
				return
			}
			_ = peerConnection.SetLocalDescription(offerAnswer)

			answerString, err := json.Marshal(offerAnswer)
			if err != nil {
				log.Println(err)
				return
			}

			_ = newPeer.Websocket.WriteJSON(&websocketMessage{
				Event: "answer",
				Data:  string(answerString),
			})
		case "answer":
			answer := webrtc.SessionDescription{}
			_ = json.Unmarshal([]byte(message.Data), &answer)
			_ = peerConnection.SetRemoteDescription(answer)
		}
	}
}
