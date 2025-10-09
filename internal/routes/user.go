package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
)

func SetupUser(routes fiber.Router, option Option) {
	handler := handlers.NewUser(option.userService, option.channelService)

	protected := routes.Use(middlewares.IsAuthenticated(option.userService, option.jwt))
	protected.Post("/:targetID/send", handler.SendMessage)
	protected.Get("/:targetID/messages", handler.GetMessages)
	protected.Put("/:targetID/messages/read", handler.MarkAllAsRead)
	protected.Get("/:id", handler.GetUserByID)
	protected.Get("/", handler.GetUsersList)
	protected.Put("/me", handler.UpdateProfile)
}
