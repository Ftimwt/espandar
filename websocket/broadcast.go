package websocket

type Broadcaster interface {
	BroadcastToUser(userID uint, event string, args ...interface{})
}
