package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/services"
	"v/pkg/models"
)

func IsChannelManager(channelService *services.Channel) fiber.Handler {
	return func(c *fiber.Ctx) error {
		channelID, err := c.ParamsInt("channelID")
		if err != nil {
			return fiber.ErrBadRequest
		}
		channel, err := channelService.FindChannelByID(uint(channelID))
		if err != nil {
			return err
		}
		if channel == nil {
			return fiber.ErrNotFound
		}

		user := c.Locals("user")
		if user == nil {
			return fiber.ErrUnauthorized
		}
		userModel, ok := user.(*models.User)
		if !ok {
			return fiber.ErrUnauthorized
		}
		userID := userModel.ID
		if channel.CreatorID != userID {
			return fiber.ErrUnauthorized
		}
		return c.Next()
	}
}
