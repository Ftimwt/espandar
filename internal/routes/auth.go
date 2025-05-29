package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
)

func SetupAuth(routes fiber.Router, option Option) {
	handler := handlers.NewAuth(option.userService)

	routes.Post("/signup", handler.Signup)
	routes.Post("/login", handler.Login)

	protected := routes.Use(middlewares.IsAuthenticated(option.userService, option.jwt))
	protected.Get("/me", handler.Me)
}
