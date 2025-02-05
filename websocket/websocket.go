package websocket

import (
	socketio "github.com/googollee/go-socket.io"
	"net/http"
)

var Server *socketio.Server

func InitSocketServer() {
	Server := socketio.NewServer(nil)

	Server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		return nil
	})

	Server.OnEvent("/", "send_message", func(s socketio.Conn, msg string) {
		Server.BroadcastToRoom("", "chat", msg)
	})

	Server.OnEvent("/", "send_private_message", func(s socketio.Conn, receiverID string, msg string) {
		s.Emit(receiverID, "private_message", msg)
	})

	Server.OnDisconnect("/", func(s socketio.Conn, msg string) {
	})
}

func SocketHandler(w http.ResponseWriter, r *http.Request) {
	Server.ServeHTTP(w, r)
}