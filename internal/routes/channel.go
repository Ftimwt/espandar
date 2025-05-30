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
	userService := services.NewUser(userRepo, option.jwt, option.notifier)

	handler := handlers.NewChannel(option.channelService)

	protected := routes.Use(middlewares.IsAuthenticated(userService, option.jwt))
	protected.Post("/", handler.Create)
	protected.Get("/", handler.List)
}
