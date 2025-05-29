package handlers

import (
	"github.com/gofiber/fiber/v2"
	_ "gorm.io/driver/sqlite"
	"net/http"
	"v/internal/dto"
	"v/internal/mapper"
	"v/internal/services"
	"v/pkg/models"
)

type Auth struct {
	service *services.User
}

func NewAuth(service *services.User) *Auth {
	return &Auth{
		service: service,
	}
}

// Signup
// @Summary Signup
// @Description Signup to system
// @Accept  json
// @Produce  json
// @Param   signup body     dto.SignupRequest true "Signup request"
// @Success 200 {object} map[string]any{status=bool,message=string,token=string}
// @Failure 400 {object} map[string]any{status=bool,message=string}
// @Router  /auth/signup [post]
func (a Auth) Signup(c *fiber.Ctx) error {
	var signup dto.SignupRequest
	if err := c.BodyParser(&signup); err != nil {
		return err
	}

	user := mapper.FromSignupRequest(signup)

	token, err := a.service.Signup(user)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"status":  true,
		"message": "welcome to system",
		"token":   token,
	})
}

// Login
// @Summary Login
// @Description Login to system
// @Accept  json
// @Produce  json
// @Param   login body     dto.LoginRequest true "Login request"
// @Success 200 {object} map[string]any{status=bool,message=string,token=string,user=models.User}
// @Failure 400 {object} map[string]any{status=bool,message=string}
// @Router  /auth/login [post]
func (a Auth) Login(c *fiber.Ctx) error {
	var login dto.LoginRequest
	if err := c.BodyParser(&login); err != nil {
		return err
	}

	user, token, err := a.service.Login(login.Username, login.Password)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"status":  true,
		"message": "Welcome to system",
		"token":   token,
		"user":    user,
	})
}

// Me
// @Summary Get user by token
// @Description Get user by token
// @Produce  json
// @Success 200 {object} map[string]any{status=bool,user=models.User}
// @Failure 400 {object} map[string]any{status=bool,message=string}
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @Router  /auth/me [get]
func (a Auth) Me(ctx *fiber.Ctx) error {
	userLocale := ctx.Locals("user")
	user := userLocale.(*models.User)

	return ctx.Status(http.StatusOK).JSON(fiber.Map{
		"status": true,
		"user":   user,
	})
}
