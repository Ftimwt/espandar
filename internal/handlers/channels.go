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
	list, err := h.service.List()
	if err != nil {
		return err
	}
	return c.Status(http.StatusOK).JSON(list)
}
