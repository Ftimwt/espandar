package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"espandar/database"
	"espandar/jwt"
	"espandar/models"
	"espandar/webrtc"

	"github.com/gorilla/websocket"
)

type SocketBroadcaster struct {
	clients map[uint]*Client
	mu      sync.RWMutex
}

type Client struct {
	userID uint
	conn   *websocket.Conn
	send   chan []byte
}

type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	To    string      `json:"to"` // کاربر مقصد (user_id)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		log.Printf("CheckOrigin: Origin=%s", origin)
		return origin == "http://localhost:3000" // محدود به کلاینت React
	},
}

var broadcaster = &SocketBroadcaster{
	clients: make(map[uint]*Client),
}

// BroadcastToUser پیام را به کاربر مقصد ارسال می‌کند
func (s *SocketBroadcaster) BroadcastToUser(userID uint, event string, data ...interface{}) {
	s.mu.RLock()
	client, exists := s.clients[userID]
	s.mu.RUnlock()

	if !exists {
		log.Printf("BroadcastToUser: User %d not connected", userID)
		return
	}

	// فرض می‌کنیم اولین آرگومان data پیام است
	var msgData interface{}
	if len(data) > 0 {
		msgData = data[0]
	} else {
		msgData = nil
	}

	msg, err := json.Marshal(Message{Event: event, Data: msgData})
	if err != nil {
		log.Printf("BroadcastToUser: Error marshaling message for user %d: %v", userID, err)
		return
	}

	select {
	case client.send <- msg:
		log.Printf("BroadcastToUser: Sent to user %d, event: %s", userID, event)
	default:
		log.Printf("BroadcastToUser: Channel full for user %d, closing", userID)
		s.mu.Lock()
		delete(s.clients, userID)
		close(client.send)
		s.mu.Unlock()
	}
}

func SocketHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("SocketHandler: Handling request: %s %s", r.Method, r.URL.String())
	log.Printf("SocketHandler: Headers: %+v", r.Header)

	// دریافت توکن از query parameter
	token := r.URL.Query().Get("Authorization")
	if token == "" {
		log.Println("SocketHandler: No token provided")
		http.Error(w, "No token provided", http.StatusUnauthorized)
		return
	}

	// اعتبارسنجی توکن
	userID, err := jwt.ValidateJWT(token)
	if err != nil {
		log.Printf("SocketHandler: Invalid token: %v", err)
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// بررسی کاربر در دیتابیس
	db := database.Database()
	if db == nil {
		log.Println("SocketHandler: Database connection is nil")
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		log.Printf("SocketHandler: User not found, ID: %d, error: %v", userID, err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// ارتقا به WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("SocketHandler: Upgrade error: %v", err)
		http.Error(w, "Could not upgrade to WebSocket", http.StatusInternalServerError)
		return
	}

	// ثبت کلاینت
	client := &Client{
		userID: userID,
		conn:   conn,
		send:   make(chan []byte, 256),
	}

	broadcaster.mu.Lock()
	broadcaster.clients[userID] = client
	broadcaster.mu.Unlock()

	log.Printf("SocketHandler: User %d connected", userID)

	// ارسال پیام خوش‌آمدگویی
	welcomeMsg, _ := json.Marshal(Message{
		Event: "connect_success",
		Data:  map[string]interface{}{"user_id": userID},
	})
	client.send <- welcomeMsg                      // ایجاد یا پیوستن به اتاق WebRTC
	receiverID := r.URL.Query().Get("receiver_id") // دریافت receiver_id از query
	roomID := createRoomID(userID, receiverID)
	room, exists := webrtc.Rooms[roomID]
	if !exists {
		room = webrtc.NewRoom()
		webrtc.Rooms[roomID] = room
	}

	// پیاده‌سازی MessageSender برای WebRTC
	sender := &WebSocketMessageSender{
		userID: userID,
		client: client,
	}

	// اتصال کاربر به اتاق WebRTC
	room.ConnectRoom(sender, webrtc.UserConnData{
		MemberID: strconv.FormatUint(uint64(userID), 10),
		Username: user.Username,
	})

	// مدیریت خواندن و نوشتن
	go client.write()
	go client.read(roomID)
}

// WebSocketMessageSender برای ارسال پیام‌های WebRTC
type WebSocketMessageSender struct {
	userID uint
	client *Client
}

func (s *WebSocketMessageSender) Emit(event string, data interface{}) {
	msg, err := json.Marshal(Message{Event: event, Data: data})
	if err != nil {
		log.Printf("WebSocketMessageSender: Error marshaling message for user %d: %v", s.userID, err)
		return
	}

	select {
	case s.client.send <- msg:
		log.Printf("WebSocketMessageSender: Sent to user %d, event: %s", s.userID, event)
	default:
		log.Printf("WebSocketMessageSender: Channel full for user %d", s.userID)
	}
}

func (c *Client) write() {
	defer func() {
		broadcaster.mu.Lock()
		delete(broadcaster.clients, c.userID)
		broadcaster.mu.Unlock()
		c.conn.Close()
		log.Printf("write: User %d disconnected", c.userID)
	}()
	for message := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
			log.Printf("write: Error sending to user %d: %v", c.userID, err)
			return
		}
	}
}

func (c *Client) read(roomID string) {
	defer func() {
		broadcaster.mu.Lock()
		delete(broadcaster.clients, c.userID)
		broadcaster.mu.Unlock()
		c.conn.Close()
		log.Printf("read: User %d disconnected", c.userID)

		// حذف کاربر از اتاق WebRTC
		if room, exists := webrtc.Rooms[roomID]; exists {
			room.RemovePeer(strconv.FormatUint(uint64(c.userID), 10))
			if len(room.Peers) == 0 {
				delete(webrtc.Rooms, roomID)
			}
		}
	}()

	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("read: Error reading from user %d: %v", c.userID, err)
			}
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Printf("read: Error unmarshaling message for user %d: %v", c.userID, err)
			continue
		}

		log.Printf("read: Received message from user %d: event=%s, to=%s", c.userID, message.Event, message.To)

		// پردازش پیام‌ها
		switch message.Event {
		case "new_message":
			if toID, err := strconv.ParseUint(message.To, 10, 32); err == nil {
				broadcaster.BroadcastToUser(uint(toID), message.Event, message.Data)
			} else {
				log.Printf("read: Invalid 'to' user ID: %s", message.To)
			}
		case "webrtc_offer", "webrtc_answer", "candidate":
			if toID, err := strconv.ParseUint(message.To, 10, 32); err == nil {
				broadcaster.BroadcastToUser(uint(toID), message.Event, message.Data)
			} else {
				log.Printf("read: Invalid 'to' user ID for WebRTC: %s", message.To)
			}
		default:
			log.Printf("read: Unknown event from user %d: %s", c.userID, message.Event)
		}
	}
} // createRoomID یک ID منحصربه‌فرد برای اتاق WebRTC ایجاد می‌کند
func createRoomID(userID uint, receiverID string) string {
	if receiverID == "" {
		return "default_" + strconv.FormatUint(uint64(userID), 10)
	}
	recvID, err := strconv.ParseUint(receiverID, 10, 32)
	if err != nil {
		return "default_" + strconv.FormatUint(uint64(userID), 10)
	}
	if userID < uint(recvID) {
		return "chat_" + strconv.FormatUint(uint64(userID), 10) + "_" + strconv.FormatUint(recvID, 10)
	}
	return "chat_" + strconv.FormatUint(recvID, 10) + "_" + strconv.FormatUint(uint64(userID), 10)
}
