package websocket

import (
	"encoding/base64"
	"encoding/json"
	"espandar/database"
	"espandar/encryption"
	"espandar/jwt"
	"espandar/models"
	"espandar/webrtc"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

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
	userID   uint
	conn     *websocket.Conn
	send     chan []byte
	roomID   string
	callType string // ✅ اضافه کن
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
		// ❌ حذف ذخیره پیام تکراری در اینجا
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

	// 🔐 اعتبارسنجی JWT
	tokenString := c.Query("Authorization")
	if strings.HasPrefix(tokenString, "Bearer ") {
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
	}
	userID, err := jwt.ValidateJWT(tokenString)
	if err != nil {
		log.Println("SocketHandler: Token validation failed:", err)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	roomID := c.Query("room_id")
	callType := c.Query("call_type")

	// 🎯 بررسی مقادیر مجاز برای call_type
	allowedCallTypes := map[string]bool{
		"chat":       true,
		"video":      true,
		"voice":      true,
		"conference": true,
	}
	if roomID == "" || !allowedCallTypes[callType] {
		log.Printf("WebSocket: missing or invalid room_id or call_type: room_id=%s, call_type=%s", roomID, callType)
		c.JSON(400, gin.H{"error": "invalid room_id or call_type"})
		return
	}

	// ⛏ بازیابی کاربر
	db := database.Database()
	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		log.Printf("SocketHandler: User not found in DB for userID %d: %v", userID, err)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// ✅ ذخیره کاربر در context
	c.Set("user", &user)
	log.Printf("SocketHandler: Authenticated user: ID=%d, Username=%s", user.ID, user.Username)

	// اتصال WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("SocketHandler: Failed to upgrade WebSocket: %v", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Could not upgrade WebSocket"})
		return
	}

	receiverID := c.Query("receiver_id")
	roomID = createRoomID(user.ID, receiverID)

	client := &Client{
		userID:   user.ID,
		conn:     conn,
		send:     make(chan []byte, 256),
		roomID:   roomID,
		callType: callType,
	}

	broadcaster.mu.Lock()
	broadcaster.clients[user.ID] = client
	if _, exists := broadcaster.rooms[roomID]; !exists {
		broadcaster.rooms[roomID] = []*Client{}
	}
	broadcaster.rooms[roomID] = append(broadcaster.rooms[roomID], client)
	broadcaster.mu.Unlock()

	// پیام اتصال موفق
	welcomeMsg, _ := json.Marshal(Message{
		Event: "connect_success",
		Data:  map[string]interface{}{"user_id": user.ID, "room_id": roomID},
	})
	client.send <- welcomeMsg

	// فعال‌سازی WebRTC اگر لازم بود
	room, exists := webrtc.Rooms[roomID]
	if !exists {
		room = webrtc.NewRoom()
		webrtc.Rooms[roomID] = room
	}
	room.ConnectRoom(&WebSocketMessageSender{userID: user.ID, client: client}, webrtc.UserConnData{
		MemberID: strconv.Itoa(int(user.ID)),
		Username: user.Username,
		CallType: callType,
	})

	go client.write()
	go client.read(roomID, db)
	log.Printf("SocketHandler: User %d connected successfully to room %s", user.ID, roomID)
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
func detectFileType(mime string) models.FileType {
	switch {
	case strings.HasPrefix(mime, "image/"):
		return models.Picture
	case strings.HasPrefix(mime, "audio/"):
		return models.Voice
	case strings.HasPrefix(mime, "video/"):
		return models.Video
	default:
		return models.Default
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
	}()

	for {
		_, msgBytes, err := c.conn.ReadMessage()
		if err != nil {
			log.Printf("read: Read error: %v", err)
			break
		}

		var message Message
		if err := json.Unmarshal(msgBytes, &message); err != nil {
			log.Printf("read: Invalid message format: %v", err)
			continue
		}

		switch message.Event {

		case "new_message":
			log.Printf("read: Processing new_message from user %d", c.userID)

			dataMap, ok := message.Data.(map[string]interface{})
			if !ok {
				log.Printf("read: Invalid message data")
				continue
			}

			content := toString(dataMap["Content"])
			messageID := toString(dataMap["message_id"])
			receiverID := uintFromFloat(dataMap["UserID"])
			messageType := toString(dataMap["Type"])
			fileName := toString(dataMap["FileName"])
			fileType := toString(dataMap["FileType"])
			fileDataBase64 := toString(dataMap["FileData"])

			// رمزنگاری محتوا
			aes := encryption.NewAESCipher()
			if content == "" {
				content = "فایل ارسالی"
			}
			encryptedContent, err := aes.Encrypt(content)
			if err != nil || encryptedContent == "" {
				log.Printf("read: Encryption failed! content='%s', err=%v", content, err)
				continue
			}

			var chat models.Chat
			if err := db.Where("(user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
				c.userID, receiverID, receiverID, c.userID).First(&chat).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					chat = models.Chat{UserID1: c.userID, UserID2: receiverID}
					if err := db.Create(&chat).Error; err != nil {
						log.Printf("read: Failed to create chat: %v", err)
						continue
					}
					log.Printf("read: Chat created between user %d and user %d", c.userID, receiverID)
				} else {
					log.Printf("read: Failed to query chat: %v", err)
					continue
				}
			}

			msg := models.Message{
				SenderID:   c.userID,
				UserID:     &receiverID,
				Content:    encryptedContent,
				Type:       messageType,
				RoomID:     &roomID,
				MessageID:  messageID,
				ChatID:     chat.ID,
				IsReceived: false,
				Seen:       false,
			}

			var sender models.User

			if err := db.First(&sender, c.userID).Error; err == nil {
				msg.SenderUsername = sender.Username
				msg.SenderProfileImage = sender.ProfileImage
			}

			var savedFilePath string
			if fileDataBase64 != "" && fileName != "" {
				parts := strings.Split(fileDataBase64, ",")
				if len(parts) == 2 {
					decoded, err := base64.StdEncoding.DecodeString(parts[1])
					if err != nil {
						log.Printf("read: Error decoding base64 file: %v", err)
						continue
					}

					uploadDir := "./Uploads"
					if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
						log.Printf("read: Error creating upload directory: %v", err)
						continue
					}

					filePath := filepath.Join(uploadDir, fmt.Sprintf("%s-%s", uuid.New().String(), fileName))
					if err := os.WriteFile(filePath, decoded, 0644); err != nil {
						log.Printf("read: Error writing file: %v", err)
						continue
					}
					savedFilePath = "/Uploads/" + filepath.Base(filePath)
					log.Printf("read: File saved to %s", savedFilePath)
				}
			}

			if err := db.Create(&msg).Error; err != nil {
				log.Printf("read: Error saving message: %v", err)
				continue
			}

			if savedFilePath != "" {
				newFile := models.File{
					FilePath:  savedFilePath,
					Type:      detectFileType(fileType),
					MessageID: msg.ID,
				}
				if err := db.Create(&newFile).Error; err != nil {
					log.Printf("read: Error saving file to DB: %v", err)
				} else {
					msg.Files = append(msg.Files, newFile)
				}
			}

			db.Model(&msg).Association("Files").Find(&msg.Files)

			broadcaster.BroadcastToUser(receiverID, "new_message", map[string]interface{}{
				"data":       msg,
				"from":       fmt.Sprintf("%d", c.userID),
				"message_id": messageID,
				"room_id":    roomID,
				"type":       messageType,
			})

		case "webrtc_offer":
			toID := message.To
			if toID == "" {
				log.Printf("read: Missing 'to' field in %s", message.Event)
				break
			}

			broadcaster.BroadcastToRoom(roomID, "webrtc_offer", map[string]interface{}{
				"data":     message.Data,
				"from":     fmt.Sprintf("%d", c.userID),
				"roomID":   roomID,
				"callType": c.callType, // ✅ اصلاح شد
			}, c.userID)

		case "webrtc_answer", "webrtc_ice_candidate":
			toID := message.To
			if toID == "" {
				log.Printf("read: Missing 'to' field in %s", message.Event)
				break
			}

			broadcaster.BroadcastToRoom(roomID, message.Event, map[string]interface{}{
				"data":   message.Data,
				"from":   fmt.Sprintf("%d", c.userID),
				"roomID": roomID,
			}, c.userID)
		case "kick_peer":
			toID := message.To
			if toID != "" {
				targetID, _ := strconv.Atoi(toID)
				broadcaster.BroadcastToUser(uint(targetID), "kick_peer", nil)
			}

		default:
			log.Printf("read: Unknown event: %s", message.Event)
		}
	}
}

// توابع کمکی
func toString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func uintFromFloat(v interface{}) uint {
	if f, ok := v.(float64); ok {
		return uint(f)
	}
	return 0
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
