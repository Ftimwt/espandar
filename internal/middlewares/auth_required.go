package middlewares

import (
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"v/internal/services"
	"v/pkg/providers"
)

func getToken(c *fiber.Ctx) string {
	token := c.GetReqHeaders()["Authorization"]
	if len(token) == 0 || len(token[0]) < 7 {
		return ""
	}
	tokenStr := token[0][7:]
	return tokenStr
}

func IsAuthenticated(service *services.User, j *providers.Jwt) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := getToken(c)
		if token == "" {
			return fiber.ErrUnauthorized
		}
		t, err := j.ParseToken(token)
		if err != nil {
			return fiber.ErrUnauthorized
		}
		claims, ok := t.Claims.(jwt.MapClaims)
		if !ok {
			return fiber.ErrUnauthorized
		}
		userID := claims["user_id"].(float64)
		if userID == 0 {
			return fiber.ErrUnauthorized
		}
		user, err := service.FindUserByID(uint(userID))
		if err != nil {
			return fiber.ErrUnauthorized
		}
		if user == nil {
			return fiber.ErrUnauthorized
		}
		c.Locals("user", user)

		return c.Next()
	}
}
