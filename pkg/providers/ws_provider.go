package providers

import (
	"strconv"
	"sync"

	"github.com/gofiber/websocket/v2"
)

type Notifier struct {
	connections map[uint]map[*websocket.Conn]struct{}
	mu          sync.RWMutex
}

func NewNotifier() *Notifier {
	return &Notifier{
		connections: make(map[uint]map[*websocket.Conn]struct{}),
	}
}

func (notifier *Notifier) HandleWebSocket(c *websocket.Conn) {
	userIDStr := c.Params("userID")
	if userIDStr == "" {
		return
	}

	user, err := strconv.ParseUint(userIDStr, 10, 64)
	if err != nil {
		return
	}
	userID := uint(user)

	notifier.mu.Lock()
	if notifier.connections[userID] == nil {
		notifier.connections[userID] = make(map[*websocket.Conn]struct{})
	}
	notifier.connections[userID][c] = struct{}{}
	notifier.mu.Unlock()

	for {
		// فقط زنده نگه داشتن کانکشن
		if _, _, err := c.ReadMessage(); err != nil {
			break
		}
	}

	// حذف کانکشن در زمان قطع اتصال
	notifier.mu.Lock()
	delete(notifier.connections[userID], c)
	if len(notifier.connections[userID]) == 0 {
		delete(notifier.connections, userID)
	}
	notifier.mu.Unlock()

	c.Close()
}

func (notifier *Notifier) Send(userID uint, message string) error {
	notifier.mu.RLock()
	conns, ok := notifier.connections[userID]
	notifier.mu.RUnlock()
	if !ok {
		return nil
	}

	for conn := range conns {
		// ارسال پیام به هر کانکشن
		if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
			// اگر خطا داد کانکشن رو ببند و حذف کن
			notifier.mu.Lock()
			conn.Close()
			delete(notifier.connections[userID], conn)
			if len(notifier.connections[userID]) == 0 {
				delete(notifier.connections, userID)
			}
			notifier.mu.Unlock()
		}
	}

	return nil
}
