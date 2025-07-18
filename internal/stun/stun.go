package stun

import (
	"fmt"
	websocket2 "github.com/fasthttp/websocket"
	"github.com/gofiber/websocket/v2"
	log "github.com/sirupsen/logrus"
	"net"
	"sync"
	"time"
)

// STUN Server Implementation
type STUNServer struct {
	conn *net.UDPConn
	port int
}

func NewSTUNServer(port int) *STUNServer {
	return &STUNServer{port: port}
}

func (s *STUNServer) Start() error {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", s.port))
	if err != nil {
		return err
	}

	s.conn, err = net.ListenUDP("udp", addr)
	if err != nil {
		return err
	}

	log.Printf("STUN server started on port %d", s.port)
	go s.handleRequests()
	return nil
}

func (s *STUNServer) handleRequests() {
	buffer := make([]byte, 1024)
	for {
		_, clientAddr, err := s.conn.ReadFromUDP(buffer)
		if err != nil {
			log.Printf("STUN read error: %v", err)
			continue
		}

		// Simple STUN response - return client's public IP and port
		response := fmt.Sprintf("STUN-RESPONSE:%s:%d", clientAddr.IP.String(), clientAddr.Port)
		s.conn.WriteToUDP([]byte(response), clientAddr)

		log.Printf("STUN request from %s, sent response: %s", clientAddr, response)
	}
}

// ICE Candidate Server (peer discovery)
type ICEServer struct {
	candidates map[string][]string
	mutex      sync.RWMutex
}

func NewICEServer() *ICEServer {
	return &ICEServer{
		candidates: make(map[string][]string),
	}
}

func (ice *ICEServer) AddCandidate(roomID, candidate string) {
	ice.mutex.Lock()
	defer ice.mutex.Unlock()

	if ice.candidates[roomID] == nil {
		ice.candidates[roomID] = make([]string, 0)
	}
	ice.candidates[roomID] = append(ice.candidates[roomID], candidate)
}

func (ice *ICEServer) GetCandidates(roomID string) []string {
	ice.mutex.RLock()
	defer ice.mutex.RUnlock()

	if candidates, exists := ice.candidates[roomID]; exists {
		return candidates
	}
	return []string{}
}

// WebRTC Signaling Types
type Message struct {
	Type      string      `json:"type"`
	Content   interface{} `json:"content"`
	RoomID    string      `json:"roomId"`
	UserID    string      `json:"userId"`
	Timestamp int64       `json:"timestamp"`
}

type Room struct {
	ID        string
	clients   map[*Client]bool
	mutex     sync.RWMutex
	createdAt time.Time
}

type Client struct {
	conn   *websocket2.Conn
	room   *Room
	userID string
	send   chan Message
	ip     string
}

type Hub struct {
	rooms      map[string]*Room
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
	iceServer  *ICEServer
}

var hub *Hub

func NewHub() *Hub {
	sync.OnceFunc(func() {
		hub = &Hub{
			rooms:      make(map[string]*Room),
			register:   make(chan *Client),
			unregister: make(chan *Client),
			iceServer:  NewICEServer(),
		}
	})()

	return hub
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			room := h.rooms[client.room.ID]
			if room == nil {
				room = &Room{
					ID:        client.room.ID,
					clients:   make(map[*Client]bool),
					createdAt: time.Now(),
				}
				h.rooms[client.room.ID] = room
			}
			room.clients[client] = true
			client.room = room
			h.mutex.Unlock()

			log.Printf("Client %s (%s) joined room %s", client.userID, client.ip, room.ID)

			// Send room info to new client
			client.send <- Message{
				Type:      "room-info",
				Content:   fmt.Sprintf("Connected to room %s", room.ID),
				RoomID:    room.ID,
				UserID:    "server",
				Timestamp: time.Now().Unix(),
			}

			// Notify other clients
			h.broadcastToRoom(room, Message{
				Type:      "user-joined",
				UserID:    client.userID,
				RoomID:    room.ID,
				Content:   client.userID,
				Timestamp: time.Now().Unix(),
			}, client)

		case client := <-h.unregister:
			h.mutex.Lock()
			if room := client.room; room != nil {
				if _, ok := room.clients[client]; ok {
					delete(room.clients, client)
					close(client.send)

					h.broadcastToRoom(room, Message{
						Type:      "user-left",
						UserID:    client.userID,
						RoomID:    room.ID,
						Content:   client.userID,
						Timestamp: time.Now().Unix(),
					}, nil)

					if len(room.clients) == 0 {
						delete(h.rooms, room.ID)
					}
				}
			}
			h.mutex.Unlock()
			log.Printf("Client %s left room", client.userID)
		}
	}
}

func (h *Hub) broadcastToRoom(room *Room, message Message, sender *Client) {
	room.mutex.RLock()
	defer room.mutex.RUnlock()

	for client := range room.clients {
		if client != sender {
			select {
			case client.send <- message:
			default:
				close(client.send)
				delete(room.clients, client)
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	for {
		var msg Message
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message from %s: %v", c.userID, err)
			break
		}

		msg.UserID = c.userID
		msg.RoomID = c.room.ID
		msg.Timestamp = time.Now().Unix()

		switch msg.Type {
		case "offer", "answer":
			log.Printf("Forwarding %s from %s", msg.Type, c.userID)
			hub.broadcastToRoom(c.room, msg, c)

		case "ice-candidate":
			// Store ICE candidate in our server
			if candidate, ok := msg.Content.(string); ok {
				hub.iceServer.AddCandidate(c.room.ID, candidate)
			}
			hub.broadcastToRoom(c.room, msg, c)

		case "get-candidates":
			// Send stored candidates to requesting client
			candidates := hub.iceServer.GetCandidates(c.room.ID)
			c.send <- Message{
				Type:      "candidates-list",
				Content:   candidates,
				RoomID:    c.room.ID,
				UserID:    "server",
				Timestamp: time.Now().Unix(),
			}
		}
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(message); err != nil {
				log.Printf("Error writing message to %s: %v", c.userID, err)
				return
			}
		}
	}
}

func ServeWS(conn *websocket.Conn) {
	roomID := conn.Query("room")
	userID := conn.Query("user")

	if roomID == "" || userID == "" {
		conn.Close()
		return
	}

	client := &Client{
		conn:   conn.Conn,
		userID: userID,
		send:   make(chan Message, 256),
		room:   &Room{ID: roomID},
		ip:     conn.RemoteAddr().String(),
	}

	hub.register <- client

	go client.writePump()
	client.readPump()
}
