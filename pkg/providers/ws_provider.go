package providers

import (
	"encoding/json"
	log "github.com/sirupsen/logrus"
	"strconv"
	"sync"
    "v/pkg/presence"

	"github.com/gofiber/websocket/v2"
)

type Notifier struct {
	connections map[uint]map[*connectionWrapper]struct{}
	mu          sync.RWMutex
}

type connectionWrapper struct {
	conn   *websocket.Conn
	sendCh chan []byte
	once   sync.Once
}

// NewNotifier initializes the Notifier
func NewNotifier() *Notifier {
	return &Notifier{
		connections: make(map[uint]map[*connectionWrapper]struct{}),
		mu:          sync.RWMutex{},
	}
}

type WSMessage struct {
	Type   string `json:"type"`
	To     uint   `json:"to,omitempty"`
	From   uint   `json:"from,omitempty"`
	Room   string `json:"room,omitempty"`
	Status string `json:"status,omitempty"`
}

// HandleWebSocket handles new websocket connections
func (notifier *Notifier) HandleWebSocket(c *websocket.Conn) {
	userIDStr := c.Params("userID")
	if userIDStr == "" {
		return
	}

	userID64, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		return
	}
	userID := uint(userID64)

	wrapper := &connectionWrapper{
		conn:   c,
		sendCh: make(chan []byte, 100), // buffered channel
	}

	// Register connection
	notifier.mu.Lock()
	if notifier.connections[userID] == nil {
		notifier.connections[userID] = make(map[*connectionWrapper]struct{})
	}
	notifier.connections[userID][wrapper] = struct{}{}
	notifier.mu.Unlock()

	// Start sending goroutine
	go notifier.listenWrite(userID, wrapper)

	// Keep connection alive
	for {
	_, contentB, err := c.ReadMessage()
	if err != nil {
		break
	}

	var msg WSMessage
	if err := json.Unmarshal(contentB, &msg); err != nil {
		log.Error("Invalid message:", err)
		continue
	}

	switch msg.Type {
	case "ice":
		if msg.To != 0 {
			_ = notifier.Send(msg.To, contentB)
		}

	case "call_request":
		notifier.Emit(msg.To, "incoming_call", map[string]interface{}{
			"from": msg.From,
			"room": msg.Room,
		})

	case "call_response":
		if msg.Status == "accepted" {
			notifier.Emit(msg.From, "call_accepted", map[string]interface{}{
				"room": msg.Room,
			})
		} else {
			notifier.Emit(msg.From, "call_rejected", map[string]interface{}{
				"room": msg.Room,
			})
		}
	}
}

	// Cleanup after disconnect
	notifier.cleanup(userID, wrapper)
}

// listenWrite continuously sends messages from channel to websocket
func (notifier *Notifier) listenWrite(userID uint, wrapper *connectionWrapper) {
	for msg := range wrapper.sendCh {
		if err := wrapper.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			break
		}
	}
	// Cleanup after connection error or closed channel
	notifier.cleanup(userID, wrapper)
}

// cleanup safely removes a connection
func (notifier *Notifier) cleanup(userID uint, wrapper *connectionWrapper) {
	notifier.mu.Lock()
	defer notifier.mu.Unlock()

	if _, ok := notifier.connections[userID]; ok {
		delete(notifier.connections[userID], wrapper)
		if len(notifier.connections[userID]) == 0 {
			delete(notifier.connections, userID)
		}
	}
	wrapper.once.Do(func() {
		close(wrapper.sendCh)
		wrapper.conn.Close()
	})
}

// Send sends a raw message to a user's connections
func (notifier *Notifier) Send(userID uint, data []byte) error {
	notifier.mu.RLock()
	conns, ok := notifier.connections[userID]
	notifier.mu.RUnlock()
	if !ok {
		return nil
	}

	for wrapper := range conns {
		select {
		case wrapper.sendCh <- data:
			// Sent successfully
		default:
			// Channel full, remove connection
			notifier.cleanup(userID, wrapper)
		}
	}

	return nil
}

// Json serializes data as JSON and sends it to the user
func (notifier *Notifier) Json(userID uint, data any) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return notifier.Send(userID, jsonData)
}

// Emit sends an event with a key and optional data (variadic)
func (notifier *Notifier) Emit(userID uint, key string, data ...any) error {
	return notifier.Json(userID, append([]any{key}, data...))
}

// Notification is a structured helper to send a "notification" type event
func (notifier *Notifier) Notification(userID uint, notifType string, data any) error {
	result := map[string]any{
		"user_id": userID,
		"type":    notifType,
		"data":    data,
	}
	return notifier.Emit(userID, "notification", result)
}

func (notifier *Notifier) HandleWebSocketWithPresence(c *websocket.Conn, presence *presence.Service){
	userIDStr := c.Params("userID")
	userID64, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		return 
	}
	userID := uint(userID64)

	wrapper := &connectionWrapper{
		conn:   c,
		sendCh: make(chan []byte, 100),
	}

	// ثبت اتصال
	notifier.mu.Lock()
	if notifier.connections[userID] == nil {
		notifier.connections[userID] = make(map[*connectionWrapper]struct{})
	}
	isFirst := len(notifier.connections[userID]) == 0
	notifier.connections[userID][wrapper] = struct{}{}
	notifier.mu.Unlock()

	// وضعیت آنلاین
	if isFirst {
		presence.SetOnline(userID)
		notifier.broadcastUserStatus(userID, "online")
	}

	// Writer
	go notifier.listenWrite(userID, wrapper)

	// Reader
	for {
		if _, _, err := c.ReadMessage(); err != nil {
	break
}
		if err != nil {
			break
		}
		// optional: parse signaling messages here
	}

	// قطع اتصال
	notifier.cleanup(userID, wrapper)

	// اگر دیگه کانکشن فعالی نداریم:
	notifier.mu.RLock()
	_, stillConnected := notifier.connections[userID]
	notifier.mu.RUnlock()
	if !stillConnected {
		presence.SetOffline(userID)
		notifier.broadcastUserStatus(userID, "offline")
	}

	return
}

func (notifier *Notifier) broadcastUserStatus(userID uint, status string) {
	msg := []any{"user_status", map[string]any{
		"user_id": userID,
		"status":  status,
	}}
	data, _ := json.Marshal(msg)

	notifier.mu.RLock()
	defer notifier.mu.RUnlock()

	for _, conns := range notifier.connections {
		for wrapper := range conns {
			select {
			case wrapper.sendCh <- data:
			default:
				go notifier.cleanup(userID, wrapper)
			}
		}
	}
}
