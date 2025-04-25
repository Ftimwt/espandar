package websocket

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"espandar/database"
	"espandar/jwt"
	"espandar/models"
	"espandar/webrtc"

	socketio "github.com/googollee/go-socket.io"
	pionwebrtc "github.com/pion/webrtc/v3"
)

// SocketConn پیاده‌سازی MessageSender برای socketio.Conn
type SocketConn struct {
	conn socketio.Conn
}

func (s *SocketConn) Emit(event string, data interface{}) {
	s.conn.Emit(event, data)
}

type WebsocketMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

var Server *socketio.Server
var userStatus = make(map[string]bool)
var rooms = make(map[string]*webrtc.Room)

func InitSocketServer() {
	Server = socketio.NewServer(nil)
	log.Println("socket.io server initialized")

	go Server.Serve()

	Server.OnConnect("/", func(s socketio.Conn) error {
		scUrl := s.URL()
		values, err := url.ParseQuery(scUrl.RawQuery)
		if err != nil {
			log.Printf("OnConnect: Failed to parse query: %v", err)
			return fmt.Errorf("failed to parse query: %v", err)
		}
		token := values.Get("Authorization")
		log.Printf("OnConnect: Received token: %s", token[:10]+"...")
		if token == "" {
			log.Println("OnConnect: No token provided")
			return errors.New("no token provided")
		}

		userID, err := jwt.ValidateJWT(token)
		if err != nil {
			log.Printf("OnConnect: Invalid token: %v, token: %s", err, token[:10]+"...")
			return fmt.Errorf("invalid token: %v", err)
		}
		log.Printf("OnConnect: Validated userID: %d", userID)

		db := database.Database()
		if db == nil {
			log.Println("OnConnect: Database connection is nil")
			return errors.New("database connection failed")
		}
		var user models.User
		if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
			log.Printf("OnConnect: User not found, ID: %d, error: %v", userID, err)
			// برای دیباگ، تمام کاربران را لاگ کنید
			var users []models.User
			db.Find(&users)
			log.Printf("OnConnect: All users in DB: %+v", users)
			return fmt.Errorf("user not found: %v", err)
		}
		log.Printf("OnConnect: Found user: %+v", user)

		roomID := fmt.Sprintf("user_%d", userID)
		s.Join(roomID)
		updateUserStatus(roomID, true)
		log.Printf("OnConnect: User %d connected, joined room: %s", userID, roomID)
		return nil
	})

	Server.OnError("/", func(s socketio.Conn, e error) {
		log.Printf("OnError: WebSocket error for connection %s: %v", s.ID(), e)
	})

	Server.OnDisconnect("/", func(s socketio.Conn, msg string) {
		log.Printf("OnDisconnect: Connection %s disconnected, reason: %s", s.ID(), msg)
	})

	// تماس خصوصی
	Server.OnEvent("/", "startPrivateCall", func(s socketio.Conn, userID1, userID2 uint, username string) {
		db := database.Database()
		var chat models.Chat
		if db.Where("user_id_1 = ? AND user_id_2 = ?", userID1, userID2).Or("user_id_1 = ? AND user_id_2 = ?", userID2, userID1).First(&chat).Error != nil {
			s.Emit("error", "No chat found")
			return
		}

		roomID := fmt.Sprintf("call_private_%d_%d", min(userID1, userID2), max(userID1, userID2))
		s.Join(roomID)
		if rooms[roomID] == nil {
			rooms[roomID] = webrtc.NewRoom()
		}
		userData := webrtc.UserConnData{
			MemberID: fmt.Sprintf("%d", userID1),
			Username: username,
		}

		// آماده‌سازی WebRTC
		rooms[roomID].ConnectRoom(&SocketConn{conn: s}, userData)

		// مدیریت سیگنالینگ
		Server.OnEvent("/", "signal", func(s socketio.Conn, msg webrtc.WebsocketMessage) {
			log.Printf("Received signal: event=%s, data=%v", msg.Event, msg.Data)
			peer := rooms[roomID].Peers[userData.MemberID]
			if peer == nil {
				log.Printf("Peer %s not found in room %s", userData.MemberID, roomID)
				s.Emit("error", "Peer not found")
				return
			}

			// چک کردن وضعیت PeerConnection
			if peer.PeerConnection.ConnectionState() == pionwebrtc.PeerConnectionStateClosed {
				log.Printf("PeerConnection for %s is closed", userData.MemberID)
				s.Emit("error", "Connection closed")
				return
			}

			switch msg.Event {
			case "offer":
				var offer pionwebrtc.SessionDescription
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: offer data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid offer data")
					return
				}
				log.Printf("Parsing offer: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &offer); err != nil {
					log.Printf("Error unmarshaling offer: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid offer format")
					return
				}
				if offer.SDP == "" || (offer.Type != pionwebrtc.SDPTypeOffer && offer.Type != pionwebrtc.SDPTypeAnswer) {
					log.Printf("Invalid offer: empty SDP or Type, offer=%v", offer)
					s.Emit("error", "Invalid offer")
					return
				}
				if err := peer.PeerConnection.SetRemoteDescription(offer); err != nil {
					log.Printf("Error setting remote description: %v, offer: %v", err, offer)
					s.Emit("error", "Failed to set offer")
					return
				}
				answer, err := peer.PeerConnection.CreateAnswer(nil)
				if err != nil {
					log.Printf("Error creating answer: %v", err)
					s.Emit("error", "Failed to create answer")
					return
				}
				if err := peer.PeerConnection.SetLocalDescription(answer); err != nil {
					log.Printf("Error setting local description: %v, answer: %v", err, answer)
					s.Emit("error", "Failed to set answer")
					return
				}
				answerData, err := json.Marshal(answer)
				if err != nil {
					log.Printf("Error marshaling answer: %v", err)
					return
				}
				log.Printf("Sending answer: %s", answerData)
				s.Emit("signal", webrtc.WebsocketMessage{Event: "answer", Data: string(answerData)})
			case "answer":
				var answer pionwebrtc.SessionDescription
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: answer data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid answer data")
					return
				}
				log.Printf("Parsing answer: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &answer); err != nil {
					log.Printf("Error unmarshaling answer: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid answer format")
					return
				}
				if answer.SDP == "" || (answer.Type != pionwebrtc.SDPTypeOffer && answer.Type != pionwebrtc.SDPTypeAnswer) {
					log.Printf("Error: empty SDP or Type, answer=%v", answer)
					s.Emit("error", "Invalid answer")
					return
				}
				if err := peer.PeerConnection.SetRemoteDescription(answer); err != nil {
					log.Printf("Error setting remote description: %v, answer: %v", err, answer)
					s.Emit("error", "Failed to set answer")
					return
				}
			case "candidate":
				var candidate pionwebrtc.ICECandidateInit
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: candidate data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid candidate data")
					return
				}
				log.Printf("Parsing candidate: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &candidate); err != nil {
					log.Printf("Error unmarshaling candidate: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid candidate format")
					return
				}
				if candidate.Candidate == "" {
					log.Printf("Invalid candidate: empty, candidate=%v", candidate)
					return
				}
				if err := peer.PeerConnection.AddICECandidate(candidate); err != nil {
					log.Printf("Error adding candidate: %v, candidate: %v", err, candidate)
					return
				}
			default:
				log.Printf("Unknown signal event: %s", msg.Event)
			}
		})

		// مدیریت قطع اتصال
		Server.OnDisconnect("/", func(s socketio.Conn, reason string) {
			log.Printf("WebRTC user %s disconnected: %s", userData.MemberID, reason)
			rooms[roomID].RemovePeer(userData.MemberID)
		})

		log.Printf("Started private call between %d and %d in room %s", userID1, userID2, roomID)
	})

	// تماس گروهی
	Server.OnEvent("/", "startGroupCall", func(s socketio.Conn, groupID, userID uint, username string) {
		db := database.Database()
		var member models.GroupMember
		if db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&member).Error != nil {
			s.Emit("error", "Not a group member")
			return
		}

		roomID := fmt.Sprintf("call_group_%d", groupID)
		s.Join(roomID)
		if rooms[roomID] == nil {
			rooms[roomID] = webrtc.NewRoom()
		}
		userData := webrtc.UserConnData{
			MemberID: fmt.Sprintf("%d", userID),
			Username: username,
		}

		// آماده‌سازی WebRTC
		rooms[roomID].ConnectRoom(&SocketConn{conn: s}, userData)

		// مدیریت سیگنالینگ
		Server.OnEvent("/", "signal", func(s socketio.Conn, msg webrtc.WebsocketMessage) {
			log.Printf("Received signal: event=%s, data=%v", msg.Event, msg.Data)
			peer := rooms[roomID].Peers[userData.MemberID]
			if peer == nil {
				log.Printf("Peer %s not found in room %s", userData.MemberID, roomID)
				s.Emit("error", "Peer not found")
				return
			}

			// چک کردن وضعیت PeerConnection
			if peer.PeerConnection.ConnectionState() == pionwebrtc.PeerConnectionStateClosed {
				log.Printf("PeerConnection for %s is closed", userData.MemberID)
				s.Emit("error", "Connection closed")
				return
			}

			switch msg.Event {
			case "offer":
				var offer pionwebrtc.SessionDescription
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: offer data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid offer data")
					return
				}
				log.Printf("Parsing offer: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &offer); err != nil {
					log.Printf("Error unmarshaling offer: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid offer format")
					return
				}
				if offer.SDP == "" || (offer.Type != pionwebrtc.SDPTypeOffer && offer.Type != pionwebrtc.SDPTypeAnswer) {
					log.Printf("Invalid offer: empty SDP or Type, offer=%v", offer)
					s.Emit("error", "Invalid offer")
					return
				}
				if err := peer.PeerConnection.SetRemoteDescription(offer); err != nil {
					log.Printf("Error setting remote description: %v, offer: %v", err, offer)
					s.Emit("error", "Failed to set offer")
					return
				}
				answer, err := peer.PeerConnection.CreateAnswer(nil)
				if err != nil {
					log.Printf("Error creating answer: %v", err)
					s.Emit("error", "Failed to create answer")
					return
				}
				if err := peer.PeerConnection.SetLocalDescription(answer); err != nil {
					log.Printf("Error setting local description: %v, answer: %v", err, answer)
					s.Emit("error", "Failed to set answer")
					return
				}
				answerData, err := json.Marshal(answer)
				if err != nil {
					log.Printf("Error marshaling answer: %v", err)
					return
				}
				log.Printf("Sending answer: %s", answerData)
				s.Emit("signal", webrtc.WebsocketMessage{Event: "answer", Data: string(answerData)})
			case "answer":
				var answer pionwebrtc.SessionDescription
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: answer data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid answer data")
					return
				}
				log.Printf("Parsing answer: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &answer); err != nil {
					log.Printf("Error unmarshaling answer: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid answer format")
					return
				}
				if answer.SDP == "" || (answer.Type != pionwebrtc.SDPTypeOffer && answer.Type != pionwebrtc.SDPTypeAnswer) {
					log.Printf("Error: empty SDP or Type, answer=%v", answer)
					s.Emit("error", "Invalid answer")
					return
				}
				if err := peer.PeerConnection.SetRemoteDescription(answer); err != nil {
					log.Printf("Error setting remote description: %v, answer: %v", err, answer)
					s.Emit("error", "Failed to set answer")
					return
				}
			case "candidate":
				var candidate pionwebrtc.ICECandidateInit
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: candidate data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid candidate data")
					return
				}
				log.Printf("Parsing candidate: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &candidate); err != nil {
					log.Printf("Error unmarshaling candidate: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid candidate format")
					return
				}
				if candidate.Candidate == "" {
					log.Printf("Invalid candidate: empty, candidate=%v", candidate)
					return
				}
				if err := peer.PeerConnection.AddICECandidate(candidate); err != nil {
					log.Printf("Error adding candidate: %v, candidate: %v", err, candidate)
					return
				}
			default:
				log.Printf("Unknown signal event: %s", msg.Event)
			}
		})

		// مدیریت قطع اتصال
		Server.OnDisconnect("/", func(s socketio.Conn, reason string) {
			log.Printf("WebRTC user %s disconnected: %s", userData.MemberID, reason)
			rooms[roomID].RemovePeer(userData.MemberID)
		})

		log.Printf("Started group call in group %d by user %d in room %s", groupID, userID, roomID)

		// اطلاع به اعضای گروه
		var members []models.GroupMember
		db.Where("group_id = ?", groupID).Find(&members)
		for _, m := range members {
			if m.UserID != userID {
				BroadcastToUser(m.UserID, "group_call_started", groupID)
			}
		}
	})

	// جوین به تماس گروهی
	Server.OnEvent("/", "joinGroupCall", func(s socketio.Conn, groupID, userID uint, username string) {
		db := database.Database()
		var member models.GroupMember
		if db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&member).Error != nil {
			s.Emit("error", "Not a group member")
			return
		}
		roomID := fmt.Sprintf("call_group_%d", groupID)
		if rooms[roomID] == nil {
			s.Emit("error", "No active group call")
			return
		}

		s.Join(roomID)
		userData := webrtc.UserConnData{
			MemberID: fmt.Sprintf("%d", userID),
			Username: username,
		}

		// آماده‌سازی WebRTC
		rooms[roomID].ConnectRoom(&SocketConn{conn: s}, userData)

		// مدیریت سیگنالینگ
		Server.OnEvent("/", "signal", func(s socketio.Conn, msg webrtc.WebsocketMessage) {
			log.Printf("Received signal: event=%s, data=%v", msg.Event, msg.Data)
			peer := rooms[roomID].Peers[userData.MemberID]
			if peer == nil {
				log.Printf("Peer %s not found in room %s", userData.MemberID, roomID)
				s.Emit("error", "Peer not found")
				return
			}

			// چک کردن وضعیت PeerConnection
			if peer.PeerConnection.ConnectionState() == pionwebrtc.PeerConnectionStateClosed {
				log.Printf("PeerConnection for %s is closed", userData.MemberID)
				s.Emit("error", "Connection closed")
				return
			}

			switch msg.Event {
			case "offer":
				var offer pionwebrtc.SessionDescription
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: offer data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid offer data")
					return
				}
				log.Printf("Parsing offer: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &offer); err != nil {
					log.Printf("Error unmarshaling offer: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid offer format")
					return
				}
				if offer.SDP == "" || (offer.Type != pionwebrtc.SDPTypeOffer && offer.Type != pionwebrtc.SDPTypeAnswer) {
					log.Printf("Invalid offer: empty SDP or Type, offer=%v", offer)
					s.Emit("error", "Invalid offer")
					return
				}
				if err := peer.PeerConnection.SetRemoteDescription(offer); err != nil {
					log.Printf("Error setting remote description: %v, offer: %v", err, offer)
					s.Emit("error", "Failed to set offer")
					return
				}
				answer, err := peer.PeerConnection.CreateAnswer(nil)
				if err != nil {
					log.Printf("Error creating answer: %v", err)
					s.Emit("error", "Failed to create answer")
					return
				}
				if err := peer.PeerConnection.SetLocalDescription(answer); err != nil {
					log.Printf("Error setting local description: %v, answer: %v", err, answer)
					s.Emit("error", "Failed to set answer")
					return
				}
				answerData, err := json.Marshal(answer)
				if err != nil {
					log.Printf("Error marshaling answer: %v", err)
					return
				}
				log.Printf("Sending answer: %s", answerData)
				s.Emit("signal", webrtc.WebsocketMessage{Event: "answer", Data: string(answerData)})
			case "answer":
				var answer pionwebrtc.SessionDescription
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: answer data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid answer data")
					return
				}
				log.Printf("Parsing answer: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &answer); err != nil {
					log.Printf("Error unmarshaling answer: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid answer format")
					return
				}
				if answer.SDP == "" || (answer.Type != pionwebrtc.SDPTypeOffer && answer.Type != pionwebrtc.SDPTypeAnswer) {
					log.Printf("Error: empty SDP or Type, answer=%v", answer)
					s.Emit("error", "Invalid answer")
					return
				}
				if err := peer.PeerConnection.SetRemoteDescription(answer); err != nil {
					log.Printf("Error setting remote description: %v, answer: %v", err, answer)
					s.Emit("error", "Failed to set answer")
					return
				}
			case "candidate":
				var candidate pionwebrtc.ICECandidateInit
				dataStr, ok := msg.Data.(string)
				if !ok {
					log.Printf("Error: candidate data is not a string, got %T: %v", msg.Data, msg.Data)
					s.Emit("error", "Invalid candidate data")
					return
				}
				log.Printf("Parsing candidate: %s", dataStr)
				if err := json.Unmarshal([]byte(dataStr), &candidate); err != nil {
					log.Printf("Error unmarshaling candidate: %v, data: %s", err, dataStr)
					s.Emit("error", "Invalid candidate format")
					return
				}
				if candidate.Candidate == "" {
					log.Printf("Invalid candidate: empty, candidate=%v", candidate)
					return
				}
				if err := peer.PeerConnection.AddICECandidate(candidate); err != nil {
					log.Printf("Error adding candidate: %v, candidate: %v", err, candidate)
					return
				}
			default:
				log.Printf("Unknown signal event: %s", msg.Event)
			}
		})

		// مدیریت قطع اتصال
		Server.OnDisconnect("/", func(s socketio.Conn, reason string) {
			log.Printf("WebRTC user %s disconnected: %s", userData.MemberID, reason)
			rooms[roomID].RemovePeer(userData.MemberID)
		})

		log.Printf("User %d joined group call in group %d", userID, groupID)
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

func BroadcastToUser(userID uint, event string, args ...interface{}) {
	roomID := fmt.Sprintf("user_%d", userID)
	log.Printf("BroadcastToUser: Broadcasting to room %s, event: %s, args: %v", roomID, event, args)
	Server.BroadcastToRoom("/", roomID, event, args...)
}

func min(a, b uint) uint {
	if a < b {
		return a
	}
	return b
}

func max(a, b uint) uint {
	if a > b {
		return a
	}
	return b
}
