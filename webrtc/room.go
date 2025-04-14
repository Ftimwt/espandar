package webrtc

import (
	"log"
	"sync"

	"github.com/pion/webrtc/v3"
)

type MessageSender interface {
	Emit(event string, data interface{})
}

type Room struct {
	Peers  map[string]*Peer
	Tracks map[string]*webrtc.TrackLocalStaticRTP
	config webrtc.Configuration
	mu     sync.Mutex
}

type Peer struct {
	ID             string
	PeerConnection *webrtc.PeerConnection
	Room           *Room
	UserData       UserConnData
	Sender         MessageSender
}

type UserConnData struct {
	MemberID string `json:"memberID"`
	Username string `json:"username"`
}

type WebsocketMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

func NewRoom() *Room {
	return &Room{
		Peers:  make(map[string]*Peer),
		Tracks: make(map[string]*webrtc.TrackLocalStaticRTP),
		config: webrtc.Configuration{
			ICEServers: []webrtc.ICEServer{
				{URLs: []string{"stun:stun.l.google.com:19302"}},
			},
		},
	}
}

func (r *Room) AddPeer(p *Peer) {
	r.mu.Lock()
	r.Peers[p.ID] = p
	r.mu.Unlock()
}

func (r *Room) RemovePeer(id string) {
	r.mu.Lock()
	delete(r.Peers, id)
	r.mu.Unlock()
}

func (r *Room) AddTrack(t *webrtc.TrackRemote, id string) *webrtc.TrackLocalStaticRTP {
	r.mu.Lock()
	defer r.mu.Unlock()
	trackLocal, err := webrtc.NewTrackLocalStaticRTP(t.Codec().RTPCodecCapability, id, "stream")
	if err != nil {
		log.Printf("Error creating local track: %v", err)
		return nil
	}
	r.Tracks[id] = trackLocal
	return trackLocal
}

func (r *Room) RemoveTrack(t *webrtc.TrackLocalStaticRTP) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.Tracks, t.ID())
}
