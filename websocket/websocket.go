package websocket

import (
	"log"
	"net/http"

	socketio "github.com/googollee/go-socket.io"
)

var Server *socketio.Server
var userStatus = make(map[string]string)

func InitSocketServer() {
	Server := socketio.NewServer(nil)

	Server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		userStatus[s.ID()] = "online"
		log.Printf("user %s conneced\n", s.ID())
		return nil
	})

	Server.OnEvent("/", "send_message", func(s socketio.Conn, msg string) {
		Server.BroadcastToRoom("", "chat", msg)
	})

	Server.OnEvent("/", "send_private_message", func(s socketio.Conn, receiverID string, msg string) {
		s.Emit(receiverID, "private_message", msg)
	})

	Server.OnDisconnect("/", func(s socketio.Conn, msg string) {
		log.Printf("user %s disconnected: %s\n", s.ID(), msg)

		updateUserStatus(s.ID(), "ofline")
	})
}

func updateUserStatus(userID string, status string) {
	userStatus[userID] = status
	log.Printf("user %s status updated to %s\n", userID, status)
}

func SocketHandler(w http.ResponseWriter, r *http.Request) {
	Server.ServeHTTP(w, r)
}
