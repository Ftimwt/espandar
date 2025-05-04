package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"espandar/database"
	"espandar/models"
	"espandar/webrtc"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// SocketBroadcaster برای مدیریت کلاینت‌ها و پخش پیام‌ها
type SocketBroadcaster struct {
	clients map[uint]*Client
	rooms   map[string][]*Client // برای پشتیبانی از اتاق‌های WebRTC و کنفرانس
	mu      sync.RWMutex
	db      *gorm.DB
}

// Client نمایانگر یک کلاینت WebSocket
type Client struct {
	userID uint
	conn   *websocket.Conn
	send   chan []byte
	roomID string // شناسه اتاق برای WebRTC یا کنفرانس
}

// Message ساختار پیام‌های WebSocket
type Message struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	To    string      `json:"to"` // برای ارسال به کاربر خاص یا اتاق
}

// تنظیمات WebSocket
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		log.Printf("SocketHandler: Checking Origin: %s", origin)
		return origin == "http://localhost:3000"
	},
}

// نمونه سراسری SocketBroadcaster
var broadcaster = &SocketBroadcaster{
	clients: make(map[uint]*Client),
	rooms:   make(map[string][]*Client),
}

// NewSocketBroadcaster برای ایجاد نمونه جدید با اتصال به دیتابیس
func NewSocketBroadcaster(db *gorm.DB) *SocketBroadcaster {
	broadcaster.db = db
	return broadcaster
}

// BroadcastToUser برای ارسال پیام به یک کاربر خاص
func (s *SocketBroadcaster) BroadcastToUser(userID uint, event string, data interface{}) {
	s.mu.RLock()
	client, exists := s.clients[userID]
	s.mu.RUnlock()

	if !exists {
		log.Printf("BroadcastToUser: User %d not connected", userID)
		return
	}

	msg, err := json.Marshal(Message{Event: event, Data: data})
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
		for i, c := range s.rooms[client.roomID] {
			if c.userID == userID {
				s.rooms[client.roomID] = append(s.rooms[client.roomID][:i], s.rooms[client.roomID][i+1:]...)
				break
			}
		}
		if len(s.rooms[client.roomID]) == 0 {
			delete(s.rooms, client.roomID)
		}
		s.mu.Unlock()
		close(client.send)
	}
}

// BroadcastToRoom برای ارسال پیام به تمام کلاینت‌های یک اتاق (به جز کاربر مشخص‌شده)
func (s *SocketBroadcaster) BroadcastToRoom(roomID string, event string, data interface{}, excludeUserID uint) {
	s.mu.RLock()
	clients, exists := s.rooms[roomID]
	s.mu.RUnlock()

	if !exists {
		log.Printf("BroadcastToRoom: Room %s not found", roomID)
		return
	}

	msg, err := json.Marshal(Message{
		Event: event,
		Data:  data})
	if err != nil {
		log.Printf("BroadcastToRoom: Error marshaling message for room %s: %v", roomID, err)
		return
	}

	for _, client := range clients {
		if client.userID != excludeUserID {
			select {
			case client.send <- msg:
				log.Printf("BroadcastToRoom: Sent to user %d in room %s, event: %s", client.userID, roomID, event)
			default:
				log.Printf("BroadcastToRoom: Channel full for user %d in room %s", client.userID, roomID)
			}
		}
	}
}

// SocketHandler برای مدیریت اتصال WebSocket
func SocketHandler(c *gin.Context) {
	// لاگ اطلاعات درخواست
	log.Printf("SocketHandler: Handling request: %s %s", c.Request.Method, c.Request.URL.String())
	log.Printf("SocketHandler: Query params: %+v", c.Request.URL.Query())
	log.Printf("SocketHandler: Headers: %+v", c.Request.Header)
	log.Printf("SocketHandler: Origin: %s", c.Request.Header.Get("Origin"))

	// بررسی Authorization از query
	authToken := c.Query("Authorization")
	log.Printf("SocketHandler: Authorization from query: %s", authToken)

	// دریافت کاربر از gin.Context
	user, exists := c.Get("user")
	if !exists {
		log.Println("SocketHandler: User not found in gin.Context")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userModel, ok := user.(*models.User)
	if !ok {
		log.Println("SocketHandler: Invalid user type in gin.Context")
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user type"})
		return
	}
	userID := userModel.ID
	log.Printf("SocketHandler: Authenticated user: ID=%d, Username=%s", userID, userModel.Username)

	// اتصال به دیتابیس
	db := database.Database()
	if db == nil {
		log.Println("SocketHandler: Database connection is nil")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	log.Println("SocketHandler: Database connection established")

	// ارتقا به WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("SocketHandler: Upgrade error: %v", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Could not upgrade to WebSocket"})
		return
	}
	log.Printf("SocketHandler: WebSocket connection upgraded successfully for user %d", userID)

	// دریافت receiver_id یا استفاده از conference
	receiverID := c.Query("receiver_id")
	log.Printf("SocketHandler: ReceiverID: %s", receiverID)
	roomID := createRoomID(userID, receiverID)
	log.Printf("SocketHandler: RoomID created: %s", roomID)

	// ایجاد کلاینت
	client := &Client{
		userID: userID,
		conn:   conn,
		send:   make(chan []byte, 256),
		roomID: roomID,
	}
	log.Printf("SocketHandler: Client created for user %d in room %s", userID, roomID)

	// ثبت کلاینت در broadcaster
	broadcaster.mu.Lock()
	broadcaster.clients[userID] = client
	if _, exists := broadcaster.rooms[roomID]; !exists {
		broadcaster.rooms[roomID] = []*Client{}
	}
	broadcaster.rooms[roomID] = append(broadcaster.rooms[roomID], client)
	broadcaster.mu.Unlock()
	log.Printf("SocketHandler: Client registered in broadcaster for user %d, room %s", userID, roomID)

	// ارسال پیام خوش‌آمدگویی
	welcomeMsg, err := json.Marshal(Message{
		Event: "connect_success",
		Data:  map[string]interface{}{"user_id": userID, "room_id": roomID},
		To:    "",
	})
	if err != nil {
		log.Printf("SocketHandler: Error marshaling welcome message: %v", err)
	} else {
		client.send <- welcomeMsg
		log.Printf("SocketHandler: Welcome message sent to user %d", userID)
	}

	// مدیریت اتاق WebRTC
	room, exists := webrtc.Rooms[roomID]
	if !exists {
		room = webrtc.NewRoom()
		webrtc.Rooms[roomID] = room
		log.Printf("SocketHandler: New WebRTC room created: %s", roomID)
	} else {
		log.Printf("SocketHandler: Using existing WebRTC room: %s", roomID)
	}

	sender := &WebSocketMessageSender{
		userID: userID,
		client: client,
	}
	room.ConnectRoom(sender, webrtc.UserConnData{
		MemberID: strconv.FormatUint(uint64(userID), 10),
		Username: userModel.Username,
	})
	log.Printf("SocketHandler: User %d connected to WebRTC room %s", userID, roomID)

	// شروع گوروتین‌ها برای خواندن و نوشتن
	go client.write()
	go client.read(roomID, db)
	log.Printf("SocketHandler: Started read/write goroutines for user %d", userID)
}

// WebSocketMessageSender برای ارسال پیام‌ها
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

// write برای ارسال پیام‌ها به کلاینت
func (c *Client) write() {
	defer func() {
		broadcaster.mu.Lock()
		delete(broadcaster.clients, c.userID)
		for i, client := range broadcaster.rooms[c.roomID] {
			if client.userID == c.userID {
				broadcaster.rooms[c.roomID] = append(broadcaster.rooms[c.roomID][:i], broadcaster.rooms[c.roomID][i+1:]...)
				break
			}
		}
		if len(broadcaster.rooms[c.roomID]) == 0 {
			delete(broadcaster.rooms, c.roomID)
		}
		broadcaster.mu.Unlock()
		c.conn.Close()
		log.Printf("write: User %d disconnected from room %s", c.userID, c.roomID)
	}()

	for message := range c.send {
		if c.conn == nil {
			log.Printf("write: Connection is nil for user %d", c.userID)
			return
		}
		err := c.conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("write: Error sending to user %d: %v", c.userID, err)
			if websocket.IsUnexpectedCloseError(err) {
				return
			}
			continue
		}
		log.Printf("write: Sent message to user %d", c.userID)
	}
}

// read برای دریافت و پردازش پیام‌ها
func (c *Client) read(roomID string, db *gorm.DB) {
	defer func() {
		// Cleanup مشابه کد فعلی
		broadcaster.mu.Lock()
		delete(broadcaster.clients, c.userID)
		for i, client := range broadcaster.rooms[roomID] {
			if client.userID == c.userID {
				broadcaster.rooms[roomID] = append(broadcaster.rooms[roomID][:i], broadcaster.rooms[roomID][i+1:]...)
				break
			}
		}
		if len(broadcaster.rooms[roomID]) == 0 {
			delete(broadcaster.rooms, roomID)
		}
		broadcaster.mu.Unlock()
		c.conn.Close()
		log.Printf("read: User %d disconnected from room %s", c.userID, roomID)

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
				log.Printf("read: Unexpected close error for user %d: %v", c.userID, err)
			} else {
				log.Printf("read: Read error for user %d: %v", c.userID, err)
			}
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Printf("read: Error unmarshaling message for user %d: %v", c.userID, err)
			continue
		}

		if message.Event == "" {
			log.Printf("read: Empty event from user %d", c.userID)
			continue
		}

		log.Printf("read: Received message from user %d in room %s: %s", c.userID, roomID, message.Event)

		switch message.Event {
		case "webrtc_offer", "webrtc_answer", "webrtc_ice_candidate":
			if message.To != "" {
				toUserID, err := strconv.ParseUint(message.To, 10, 32)
				if err != nil {
					log.Printf("read: Invalid 'to' user ID: %s", message.To)
					continue
				}
				broadcaster.BroadcastToUser(uint(toUserID), message.Event, message.Data)
			} else {
				broadcaster.BroadcastToRoom(roomID, message.Event, message.Data, c.userID)
			}
		case "conference_invite":
			var conference models.Conference
			if err := db.Where("room_id = ?", roomID).First(&conference).Error; err == nil {
				for _, member := range conference.Members {
					broadcaster.BroadcastToUser(member.ID, "conference_invite", message.Data)
				}
			} else {
				log.Printf("read: Conference not found for room %s: %v", roomID, err)
			}
		case "new_message":
			// ذخیره پیام در دیتابیس و پخش به اتاق
			var msgData models.Message
			switch data := message.Data.(type) {
			case []byte:
				if err := json.Unmarshal(data, &msgData); err != nil {
					log.Printf("read: Error unmarshaling message data: %v", err)
					continue
				}
			case string:
				if err := json.Unmarshal([]byte(data), &msgData); err != nil {
					log.Printf("read: Error unmarshaling message data: %v", err)
					continue
				}
			default:
				// اگر نوع دیگری باشد، دوباره به JSON تبدیل کن
				dataBytes, err := json.Marshal(data)
				if err != nil {
					log.Printf("read: Error marshaling message.Data to JSON: %v", err)
					continue
				}
				if err := json.Unmarshal(dataBytes, &msgData); err != nil {
					log.Printf("read: Error unmarshaling message data: %v", err)
					continue
				}
			}
			msgData.SenderID = c.userID
			msgData.RoomID = &roomID
			if err := db.Create(&msgData).Error; err != nil {
				log.Printf("read: Error saving message to database: %v", err)
				continue
			}
			broadcaster.BroadcastToRoom(roomID, "new_message", message.Data, 0)
		default:
			log.Printf("read: Unknown event from user %d: %s", c.userID, message.Event)
		}
	}
}

// createRoomID برای ایجاد شناسه اتاق بر اساس userID و receiverID
func createRoomID(userID uint, receiverID string) string {
	if receiverID == "conference" {
		return "conference_" + strconv.FormatUint(uint64(userID), 10)
	}
	if receiverID == "" {
		return "room_" + strconv.FormatUint(uint64(userID), 10)
	}
	return "room_" + strconv.FormatUint(uint64(userID), 10) + "_" + receiverID
}
