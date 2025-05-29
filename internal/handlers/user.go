package handlers

import (
	"github.com/gofiber/fiber/v2"
	"net/http"
	"v/internal/dto"
	"v/internal/services"
)

type User struct {
	service *services.User
}

func NewUser(service *services.User) *User {
	return &User{
		service: service,
	}
}

func (u User) SendMessage(c *fiber.Ctx) error {
	targetID, err := c.ParamsInt("targetID")
	if err != nil {
		return err
	}
	var body dto.Message
	if err := c.BodyParser(&body); err != nil {
		return err
	}
	user := getUser(c)
	message, err := u.service.SendMessage(user.ID, uint(targetID), body)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(map[string]any{
		"status":  true,
		"message": message,
	})
}

func (u User) GetMessages(c *fiber.Ctx) error {
	targetID, err := c.ParamsInt("targetID")
	if err != nil {
		return err
	}
	user := getUser(c)

	limit := c.QueryInt("limit", 10)
	skip := c.QueryInt("skip", 0)
	messages, err := u.service.GetMessages(user.ID, uint(targetID), limit, skip)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(map[string]any{
		"status":   true,
		"messages": messages,
	})
}
