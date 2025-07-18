package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
)

func SetupGroup(routes fiber.Router, option Option) {
	handler := handlers.NewGroup(option.groupService)
	protected := routes.Use(middlewares.IsAuthenticated(option.userService, option.jwt))

	protected.Get("/:groupID/messages", handler.Messages)
	protected.Put("/:groupID/messages/read", handler.MarkAsRead)
	protected.Post("/:groupID/send", handler.Send)
	protected.Get("/:groupID", handler.GroupByID)
	protected.Post("/", handler.CreateGroup)
}
