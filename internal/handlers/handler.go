package handlers

import (
	"github.com/gofiber/fiber/v2"
	"v/pkg/models"
)

func getUser(c *fiber.Ctx) *models.User {
	user := c.Locals("user")
	if user == nil {
		return nil
	}
	userModel, ok := user.(*models.User)
	if !ok {
		return nil
	}
	return userModel
}
