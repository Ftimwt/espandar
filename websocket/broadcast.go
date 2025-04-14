package websocket

type Broadcaster interface {
	BroadcastToUser(userID uint, event string, args ...interface{})
}

type SocketBroadcaster struct{}

func (s *SocketBroadcaster) BroadcastToUser(userID uint, event string, args ...interface{}) {
	BroadcastToUser(userID, event, args...)
}
