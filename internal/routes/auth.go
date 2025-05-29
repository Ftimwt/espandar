package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"v/internal/handlers"
	"v/internal/repositories"
	"v/internal/services"
	"v/pkg/providers"
)

func SetupAuth(routes fiber.Router, db *gorm.DB, jwt *providers.Jwt) {
	repo := repositories.NewUser(db)
	service := services.NewUser(repo, jwt)
	handler := handlers.NewAuth(service)

	routes.Post("/signup", handler.Signup)
	routes.Post("/login", handler.Login)
}
