package handlers

import (
	"github.com/gofiber/websocket/v2"
	"sync"
)

type RoomRTC struct {
	Peers map[*websocket.Conn]bool
	Mutex sync.Mutex
}

var rooms = make(map[string]*RoomRTC)
var roomsMutex sync.Mutex

func getOrCreateRoom(roomID string) *RoomRTC {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()
	if room, ok := rooms[roomID]; ok {
		return room
	}
	room := &RoomRTC{Peers: make(map[*websocket.Conn]bool)}
	rooms[roomID] = room
	return room
}

func HandleWebRTC(conn *websocket.Conn) {
	roomID := conn.Params("roomId")
	defer conn.Close()

	room := getOrCreateRoom(roomID)
	room.Mutex.Lock()
	room.Peers[conn] = true
	room.Mutex.Unlock()

	defer func() {
		room.Mutex.Lock()
		delete(room.Peers, conn)
		room.Mutex.Unlock()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		room.Mutex.Lock()
		for peer := range room.Peers {
			if peer != conn {
				peer.WriteMessage(websocket.TextMessage, msg)
			}
		}
		room.Mutex.Unlock()
	}
}
