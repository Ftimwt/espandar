package handlers

import (
	"github.com/gofiber/fiber/v2"
	"net/http"
	"v/internal/dto"
	"v/internal/services"
	"v/pkg/http/response"
)

type Channel struct {
	service *services.Channel
}

func NewChannel(service *services.Channel) *Channel {
	return &Channel{
		service: service,
	}
}

func (h *Channel) Create(c *fiber.Ctx) error {
	var body dto.ChannelCreate
	if err := c.BodyParser(&body); err != nil {
		return err
	}

	user := getUser(c)

	channel, err := h.service.Create(user.ID, body)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(map[string]any{
		"status":  true,
		"message": "channel created",
		"channel": channel,
	})
}

func (h *Channel) List(c *fiber.Ctx) error {
	user := getUser(c)
	list, err := h.service.GetUserChannels(user.ID)
	if err != nil {
		return err
	}
	return c.Status(http.StatusOK).JSON(list)
}

// SendMessage sends a message to a channel by its ID.
// It expects the channel ID in the route path and the message body as a JSON object.
// It returns the sent message on success, or an error if any occurs.
func (h *Channel) SendMessage(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	var body dto.Message
	channelID, err := ctx.ParamsInt("channelID")
	if err != nil {
		return err
	}
	if err := ctx.BodyParser(&body); err != nil {
		return err
	}
	message, err := h.service.SendMessage(user.ID, uint(channelID), &body)
	if err != nil {
		return err
	}
	return ctx.Status(http.StatusOK).JSON(message)
}

func (h *Channel) GetMessages(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("channelID")
	if err != nil {
		return err
	}
	limit := ctx.QueryInt("limit", 10)
	skip := ctx.QueryInt("skip", 0)
	messages, err := h.service.GetMessages(user.ID, uint(channelID), limit, skip)
	if err != nil {
		return err
	}
	return response.
		WithStatus(http.StatusOK).
		WithField("messages", messages).
		Send(ctx)
}

func (h *Channel) GetByID(ctx *fiber.Ctx) error {
	channelID, err := ctx.ParamsInt("channelID")
	if err != nil {
		return err
	}
	channel, err := h.service.FindChannelByID(uint(channelID))
	if err != nil {
		return err
	}
	return response.WithField("channel", channel).Send(ctx)
}

// MarkAllAsRead marks all messages in the specified channel as read by the given user.
// It expects the channel ID in the route path.
// It returns an error if any occurs during the operation.
func (h *Channel) MarkAllAsRead(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("channelID")
	if err != nil {
		return err
	}
	_, err = h.service.MarkAllAsRead(user.ID, uint(channelID))
	if err != nil {
		return err
	}
	return response.WithStatus(http.StatusOK).Send(ctx)
}

// MarkAsRead marks the specified message as read by the given user.
// It expects the channel ID and message ID in the route path.
// It returns an error if any occurs during the operation.
func (h *Channel) MarkAsRead(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("channelID")
	if err != nil {
		return err
	}
	messageID, err := ctx.ParamsInt("messageID")
	if err != nil {
		return err
	}
	_, err = h.service.MarkAsRead(user.ID, uint(channelID), uint(messageID))
	if err != nil {
		return err
	}
	return response.WithStatus(http.StatusOK).Send(ctx)
}

func (h *Channel) UpdateMessage(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	messageID, err := ctx.ParamsInt("messageID")
	if err != nil {
		return err
	}

	var body struct {
		Text string `json:"text"`
	}
	if err := ctx.BodyParser(&body); err != nil {
		return err
	}

	if err := h.service.UpdateMessage(user.ID, uint(messageID), body.Text); err != nil {
		return err
	}

	return ctx.SendStatus(http.StatusOK)
}

func (h *Channel) DeleteMessage(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	messageID, err := ctx.ParamsInt("messageID")
	if err != nil {
		return err
	}

	if err := h.service.DeleteMessage(user.ID, uint(messageID)); err != nil {
		return err
	}

	return ctx.SendStatus(http.StatusOK)
}

func (h *Channel) ForwardMessage(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("channelID")
	if err != nil {
		return err
	}
	messageID, err := ctx.ParamsInt("messageID")
	if err != nil {
		return err
	}

	message, err := h.service.ForwardMessage(user.ID, uint(channelID), uint(messageID))
	if err != nil {
		return err
	}

	return ctx.Status(http.StatusOK).JSON(message)
}
