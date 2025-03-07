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
		log.Printf("user %s connected\n", s.ID())
		return nil
	})

	Server.OnEvent("/", "send_message", func(s socketio.Conn, msg models.Message) {
		Server.BroadcastToRoom("/", fmt.Sprintf("user_%d", msg.UserID), "new_message", msg)
	})

	Server.OnEvent("/", "offer", func(s socketio.Conn, offer models.OfferMessage) {
		log.Printf("received offer from user %s: %+v\n", s.ID(), offer)
		Server.BroadcastToRoom("/", fmt.Sprintf("user_%d", offer.ReceiverID), "offer", offer)
	})

	Server.OnEvent("/", "answer", func(s socketio.Conn, answer models.AnswerMessage) {
		log.Printf("received answer from user %s: %+v\n", s.ID(), answer)
		Server.BroadcastToRoom("/", fmt.Sprintf("user_%d", answer.ReceiverID), "answer", answer)
	})

	Server.OnEvent("/", "ice_candidate", func(s socketio.Conn, candidate models.ICECandidate) {
		log.Printf("received ICE candidate from user %s: %+v\n", s.ID(), candidate)
		Server.BroadcastToRoom("/", fmt.Sprintf("user_%d", candidate.ReceiverID), "ice_candidate", candidate)
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
