package handlers

import (
	"github.com/gofiber/fiber/v2"
	"net/http"
	"v/internal/dto"
	"v/internal/services"
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
