package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
	"v/internal/repositories"
	"v/internal/services"
)

func SetupChannel(routes fiber.Router, option Option) {
	userRepo := repositories.NewUser(option.db)
	userService := services.NewUser(userRepo, option.jwt, option.notifier, nil)

	handler := handlers.NewChannel(option.channelService)

	protected := routes.Use(middlewares.IsAuthenticated(userService, option.jwt))
	protected.Post("/", handler.Create)
	protected.Get("/", handler.List)
	protected.Get("/:channelID", handler.GetByID)
	protected.Get("/:channelID/messages", handler.GetMessages)
	protected.Put("/:channelID/messages/read", handler.MarkAllAsRead)
	protected.Put("/:channelID/messages/:messageID/read", handler.MarkAsRead)

	creator := protected.Group("/:channelID").Use(middlewares.IsChannelManager(option.channelService))
	creator.Post("/send", handler.SendMessage)
	//creator.Post("/:channelID", handler.Update)
	//creator.Delete("/:channelID", handler.Delete)
}
