package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

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
	Event     string      `json:"event"`
	Data      interface{} `json:"data"`
	To        string      `json:"to"`
	MessageID string      `json:"message_id"`
}

// تنظیمات WebSocket
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
		//origin := r.Header.Get("Origin")
		//log.Printf("SocketHandler: Checking Origin: %s", origin)
		//return origin == "http://localhost:3000"
	},
	HandshakeTimeout: 10 * time.Second,
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
		log.Printf("BroadcastToUser: User %d not connected for event %s", userID, event)
		if event == "new_message" {
			// استخراج داده‌های پیام
			rawData, ok := data.(map[string]interface{})
			if !ok {
				log.Printf("BroadcastToUser: Invalid data format for user %d", userID)
				return
			}

			// استخراج اطلاعات از پیام
			messageID, _ := rawData["message_id"].(string)
			dataMap, _ := rawData["data"].(map[string]interface{})
			content, _ := dataMap["Content"].(string)
			messageType, _ := rawData["type"].(string)
			roomID, _ := rawData["room_id"].(string)
			senderIDStr, _ := rawData["from"].(string)
			senderID, _ := strconv.ParseUint(senderIDStr, 10, 32)
			chatIDFloat, _ := dataMap["ChatID"].(float64)
			chatID := uint(chatIDFloat)
			tags, _ := dataMap["Tags"].([]interface{})
			var tagsStr string
			if tags != nil {
				tagsBytes, err := json.Marshal(tags)
				if err == nil {
					tagsStr = string(tagsBytes)
				}
			}

			// ایجاد مدل پیام
			message := models.Message{
				SenderID:   uint(senderID),
				UserID:     &userID, // گیرنده
				Content:    content,
				Type:       messageType,
				RoomID:     &roomID,
				ChatID:     chatID,
				MessageID:  messageID,
				Tags:       tagsStr,
				IsReceived: false,
				Seen:       false,
			}

			// ذخیره پیام در دیتابیس
			if err := s.db.Create(&message).Error; err != nil {
				log.Printf("BroadcastToUser: Error saving message for user %d: %v", userID, err)
			} else {
				log.Printf("BroadcastToUser: Message saved for offline user %d, message_id: %s", userID, messageID)
			}
		}
		return
	}

	msg, err := json.Marshal(Message{Event: event, Data: data})
	if err != nil {
		log.Printf("BroadcastToUser: Error marshaling message for user %d: %v", userID, err)
		return
	}
	log.Printf("BroadcastToUser: Sending to user %d, event: %s, data: %+v", userID, event, data)
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
	log.Printf("SocketHandler: Handling request: %s %s", c.Request.Method, c.Request.URL.String())
	log.Printf("SocketHandler: Query params: %+v", c.Request.URL.Query())
	log.Printf("SocketHandler: Headers: %+v", c.Request.Header)
	log.Printf("SocketHandler: Origin: %s", c.Request.Header.Get("Origin"))

	// بررسی کاربر از gin.Context (توسط JWTAuthMiddleware تنظیم شده)
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

	// دریافت receiver_id و call_type
	receiverID := c.Query("receiver_id")
	callType := c.Query("call_type")
	log.Printf("SocketHandler: ReceiverID: %s, CallType: %s", receiverID, callType)
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

	// بررسی و ارسال پیام‌های ذخیره‌شده
	var pendingMessages []models.Message
	if err := db.Where("user_id = ? AND is_received = ?", userID, false).Find(&pendingMessages).Error; err != nil {
		log.Printf("SocketHandler: Error fetching pending messages for user %d: %v", userID, err)
	} else {
		for _, msg := range pendingMessages {
			tags, err := msg.GetTags()
			if err != nil {
				log.Printf("SocketHandler: Error parsing tags for message %s: %v", msg.MessageID, err)
			}
			messageData := map[string]interface{}{
				"data": map[string]interface{}{
					"Content": msg.Content,
					"UserID":  *msg.UserID,
					"ChatID":  msg.ChatID,
					"Type":    msg.Type,
					"Tags":    tags,
				},
				"from":       strconv.FormatUint(uint64(msg.SenderID), 10),
				"message_id": msg.MessageID,
				"room_id":    msg.RoomID,
				"type":       msg.Type,
			}
			msgBytes, err := json.Marshal(Message{
				Event: "new_message",
				Data:  messageData,
			})
			if err != nil {
				log.Printf("SocketHandler: Error marshaling pending message %s for user %d: %v", msg.MessageID, userID, err)
				continue
			}
			client.send <- msgBytes
			log.Printf("SocketHandler: Sent pending message %s to user %d", msg.MessageID, userID)

			// به‌روزرسانی وضعیت پیام
			msg.IsReceived = true
			if err := db.Save(&msg).Error; err != nil {
				log.Printf("SocketHandler: Error updating message %s for user %d: %v", msg.MessageID, userID, err)
			}
		}
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
		CallType: callType,
	})
	log.Printf("SocketHandler: User %d connected to WebRTC room %s with callType %s", userID, roomID, callType)

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
	ticker := time.NewTicker(30 * time.Second) // ارسال ping هر 30 ثانیه
	defer func() {
		ticker.Stop()
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

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
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
		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("write: Error sending ping to user %d: %v", c.userID, err)
				return
			}
			log.Printf("write: Sent ping to user %d", c.userID)
		}
	}
}

// read برای دریافت و پردازش پیام‌ها
func (c *Client) read(roomID string, db *gorm.DB) {
	defer func() {
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

		log.Printf("read: Received message from user %d in room %s: %s, data: %v", c.userID, roomID, message.Event, message.Data)

		switch message.Event {
		case "webrtc_offer", "webrtc_answer", "webrtc_ice_candidate":
			log.Printf("read: Received %s for user %d, to: %s, data: %v", message.Event, c.userID, message.To, message.Data)
			if message.To == "" {
				log.Printf("read: Empty 'to' field for %s, broadcasting to room %s (excluding user %d)", message.Event, roomID, c.userID)
				broadcaster.BroadcastToRoom(roomID, message.Event, map[string]interface{}{
					"data": message.Data,
					"from": strconv.FormatUint(uint64(c.userID), 10),
				}, c.userID)
				continue
			}
			toUserID, err := strconv.ParseUint(message.To, 10, 32)
			if err != nil {
				log.Printf("read: Invalid 'to' user ID: %s", message.To)
				continue
			}
			broadcaster.BroadcastToUser(uint(toUserID), message.Event, map[string]interface{}{
				"data": message.Data,
				"from": strconv.FormatUint(uint64(c.userID), 10),
			})

		case "conference_invite":
			var conference models.Conference
			if err := db.Where("room_id = ?", roomID).First(&conference).Error; err == nil {
				for _, member := range conference.Members {
					broadcaster.BroadcastToUser(member.ID, "conference_invite", map[string]interface{}{
						"data": message.Data,
						"from": strconv.FormatUint(uint64(c.userID), 10),
					})
				}
			} else {
				log.Printf("read: Conference not found for room %s: %v", roomID, err)
			}

		case "new_message":
			log.Printf("read: Processing new_message from user %d: %v", c.userID, message.Data)
			var rawData map[string]interface{}
			var dataBytes []byte

			// استخراج داده‌ها
			switch data := message.Data.(type) {
			case string:
				dataBytes = []byte(data)
			default:
				var err error
				dataBytes, err = json.Marshal(data)
				if err != nil {
					log.Printf("read: Error marshaling message.Data: %v", err)
					continue
				}
			}
			if err := json.Unmarshal(dataBytes, &rawData); err != nil {
				log.Printf("read: Error unmarshaling raw message data: %v", err)
				continue
			} // بررسی message_id
			var messageID string
			if msgID, ok := rawData["message_id"].(string); ok && msgID != "" {
				messageID = msgID
			} else {
				log.Printf("read: No message_id provided for message from user %d", c.userID)
				continue
			}

			// تنظیم ReceiverID
			var receiverID uint
			if rawReceiverID, ok := rawData["UserID"].(float64); ok {
				receiverID = uint(rawReceiverID)
			} else {
				log.Printf("read: UserID not found in message data for user %d: %v", c.userID, rawData)
				continue
			}

			// تنظیم RoomID
			if roomID == "" {
				roomID = createRoomID(c.userID, strconv.FormatUint(uint64(receiverID), 10))
				log.Printf("read: Generated roomID: %s for user %d and receiver %d", roomID, c.userID, receiverID)
			}

			// تنظیم Type
			messageType := "text"
			if msgType, ok := rawData["type"].(string); ok && msgType != "" {
				messageType = msgType
			}

			// لاگ اطلاعات پیام
			log.Printf("read: Broadcasting message: SenderID=%d, ReceiverID=%d, Content=%v, Type=%s, RoomID=%s, MessageID=%s",
				c.userID, receiverID, rawData["Content"], messageType, roomID, messageID)

			// ارسال پیام به گیرنده
			broadcaster.BroadcastToUser(receiverID, "new_message", map[string]interface{}{
				"data":       rawData,
				"from":       strconv.FormatUint(uint64(c.userID), 10),
				"message_id": messageID,
				"room_id":    roomID,
				"type":       messageType,
			})

		default:
			log.Printf("read: Unknown event from user %d: %s", c.userID, message.Event)
		}
	}
}

// createRoomID برای ایجاد شناسه اتاق بر اساس userID و receiverID
func createRoomID(userID uint, receiverID string) string {
	if receiverID == "" {
		return "user_" + strconv.FormatUint(uint64(userID), 10)
	}
	if receiverID == "conference" {
		return "conference_" + strconv.FormatUint(uint64(userID), 10)
	}
	ids := []uint{userID, uint(atoi(receiverID))}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	return "room_" + strconv.FormatUint(uint64(ids[0]), 10) + "_" + strconv.FormatUint(uint64(ids[1]), 10)
}

func atoi(s string) int {
	i, _ := strconv.Atoi(s)
	return i
}
