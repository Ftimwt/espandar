package handlers

import (
	"github.com/gofiber/fiber/v2"
	"net/http"
	"v/internal/dto"
	"v/internal/services"
	"v/pkg/http/response"
)

type User struct {
	service        *services.User
	channelService *services.Channel
}

func NewUser(service *services.User, channelService *services.Channel) *User {
	return &User{
		service:        service,
		channelService: channelService,
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

func (u User) GetUsersList(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)
	query := c.Query("q")
	user := getUser(c)
	users, err := u.service.GetUsersList(services.UsersListOption{
		Limit:       limit,
		Offset:      offset,
		Query:       query,
		CurrentUser: user.ID,
	})
	if err != nil {
		return err
	}

	return response.WithField("users", users).SendWithStatus(c, fiber.StatusOK)
}

func (u User) GetUserByID(c *fiber.Ctx) error {
	userId, err := c.ParamsInt("id")
	if err != nil {
		return err
	}
	users, err := u.service.FindUserByID(uint(userId))
	if err != nil {
		return err
	}
	return response.WithField("user", users).SendWithStatus(c, fiber.StatusOK)
}
