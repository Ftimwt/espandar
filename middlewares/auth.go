package middlewares

import (
	"espandar/jwt"
	"espandar/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.Request.Header.Get("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no authorization header provided"})
			c.Abort()
			return
		}

		tokenString = tokenString[len("bearer "):]

		userID, err := jwt.ValidateJWT(tokenString)

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		user := &models.User{
			Model: gorm.Model{
				ID: userID,
			},
		}
		c.Set("user", user)
		c.Next()
	}
}
