package websocket

import (
	"errors"
	"espandar/database"
	"espandar/jwt"
	"espandar/models"
	"fmt"
	"log"
	"net/http"
	"net/url"

	socketio "github.com/googollee/go-socket.io"
)

var Server *socketio.Server
var userStatus = make(map[string]bool)

func InitSocketServer() {
	Server = socketio.NewServer(nil)

	go Server.Serve()

	Server.OnConnect("/", func(s socketio.Conn) error {
		scUrl := s.URL()

		values, _ := url.ParseQuery(scUrl.RawQuery)
		token := values["Authorization"]
		if len(token) == 0 {
			return errors.New("invalid token")
		}

		userID, err := jwt.ValidateJWT(token[0])
		if err != nil {
			log.Print("error socket token on connect: ", err)
			return err
		}

		db := database.Database()
		var user models.User
		tx := db.Where("id=?", userID).Find(&user)
		if err := tx.Error; err != nil {
			log.Print("socket on connect: ", err)
			return err
		}

		s.Join(fmt.Sprintf("user_%d", userID))
		updateUserStatus(fmt.Sprintf("user_%d", userID), true)
		log.Printf("user %s conneced\n", s.ID())
		return nil
	})

	Server.OnEvent("/", "send_message", func(s socketio.Conn, msg string) {
		Server.BroadcastToRoom("", "chat", msg)
	})

	Server.OnDisconnect("/", func(s socketio.Conn, msg string) {
		log.Printf("user %s disconnected: %s\n", s.ID(), msg)

		updateUserStatus(s.ID(), false)
	})
}

func updateUserStatus(userID string, status bool) {
	userStatus[userID] = status
	log.Printf("user %s status updated to %v\n", userID, status)
}

func SocketHandler(w http.ResponseWriter, r *http.Request) {
	Server.ServeHTTP(w, r)
}

func BroadcastToUser(userID uint, event string, args ...any) {
	roomID := fmt.Sprintf("user_%d", userID)
	Server.BroadcastToRoom("/", roomID, event, args...)
}
