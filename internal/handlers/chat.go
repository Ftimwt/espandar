package handlers

import (
	"v/internal/services"
	"v/pkg/chat"
	"v/pkg/http/response"
	w "v/pkg/webrtc"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func RoomChat(c *fiber.Ctx) error {
	return c.Render("chat", fiber.Map{}, "layouts/main")
}

func RoomChatWebsocket(c *websocket.Conn) {
	uuid := c.Params("uuid")
	if uuid == "" {
		return
	}

	w.RoomsLock.Lock()
	room := w.Rooms[uuid]
	w.RoomsLock.Unlock()
	if room == nil {
		return
	}
	if room.Hub == nil {
		return
	}
	chat.PeerChatConn(c.Conn, room.Hub)
}

func StreamChatWebsocket(c *websocket.Conn) {
	suuid := c.Params("suuid")
	if suuid == "" {
		return
	}

	w.RoomsLock.Lock()
	if stream, ok := w.Streams[suuid]; ok {
		w.RoomsLock.Unlock()
		if stream.Hub == nil {
			hub := chat.NewHub()
			stream.Hub = hub
			go hub.Run()
		}
		chat.PeerChatConn(c.Conn, stream.Hub)
		return
	}
	w.RoomsLock.Unlock()
}

type Chat struct {
	service services.ChatI
}

func NewChat(service services.ChatI) *Chat {
	return &Chat{
		service: service,
	}
}

func (chat Chat) LatestChats(c *fiber.Ctx) error {
	limit := c.QueryInt("limit")
	offset := c.QueryInt("offset")

	chats, err := chat.service.LatestChats(services.LatestChatsOption{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		c.Status(fiber.StatusInternalServerError)
		return nil
	}

	return response.WithField("chats", chats).WithStatus(fiber.StatusOK).Send(c)
}
