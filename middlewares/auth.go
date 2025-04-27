package middlewares

import (
	"espandar/jwt"
	"espandar/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// ابتدا بررسی هدر Authorization
		tokenString := c.Request.Header.Get("Authorization")
		if tokenString != "" && strings.HasPrefix(tokenString, "Bearer ") {
			tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		} else {
			// سپس بررسی query parameter
			tokenString = c.Query("Authorization")
		}

		if tokenString == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No authorization token provided"})
			c.Abort()
			return
		}

		userID, err := jwt.ValidateJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			}
			c.Abort()
			return
		}

		c.Set("user", &user)
		c.Next()
	}
}
