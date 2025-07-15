package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
)

func SetupChat(routes fiber.Router, option Option) {
	handler := handlers.NewChat(option.chatService)

	protected := routes.Use(middlewares.IsAuthenticated(option.userService, option.jwt))
	protected.Get("/latest", handler.LatestChats)
	protected.Post("/upload", handlers.UploadFile)
}
