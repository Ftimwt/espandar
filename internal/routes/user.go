package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
	"v/internal/repositories"
	"v/internal/services"
)

func SetupUser(routes fiber.Router, option Option) {
	userRepo := repositories.NewUser(option.db)
	userService := services.NewUser(userRepo, option.jwt)

	handler := handlers.NewUser(option.userService)

	protected := routes.Use(middlewares.IsAuthenticated(userService, option.jwt))
	protected.Post("/:targetID/send", handler.SendMessage)
	protected.Get("/:targetID/messages", handler.GetMessages)
}
