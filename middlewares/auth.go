package middlewares

import (
	"espandar/jwt"
	"espandar/models"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func AuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// لاگ شروع middleware
		log.Printf("AuthMiddleware: Processing request: %s %s", c.Request.Method, c.Request.URL.String())

		// بررسی query parameter برای Authorization
		tokenString := c.Query("Authorization")
		log.Printf("AuthMiddleware: Token from query: %s", tokenString)

		// اگه توکن توی query نبود، از هدر بگیر
		if tokenString == "" {
			tokenString = c.Request.Header.Get("Authorization")
			log.Printf("AuthMiddleware: Token from header: %s", tokenString)
			if tokenString != "" && strings.HasPrefix(tokenString, "Bearer ") {
				tokenString = strings.TrimPrefix(tokenString, "Bearer ")
				log.Printf("AuthMiddleware: Token after trimming Bearer: %s", tokenString)
			}
		}

		// اگه توکن پیدا نشد
		if tokenString == "" {
			log.Println("AuthMiddleware: No authorization token provided")
			c.JSON(http.StatusBadRequest, gin.H{"error": "No authorization token provided"})
			c.Abort()
			return
		}

		// اعتبارسنجی توکن
		userID, err := jwt.ValidateJWT(tokenString)
		if err != nil {
			log.Printf("AuthMiddleware: Invalid token: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}
		log.Printf("AuthMiddleware: Token validated, userID: %d", userID)

		// جستجوی کاربر در پایگاه داده
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				log.Printf("AuthMiddleware: User not found for userID: %d", userID)
				c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			} else {
				log.Printf("AuthMiddleware: Database error: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			}
			c.Abort()
			return
		}
		log.Printf("AuthMiddleware: User found: ID=%d, Username=%s", user.ID, user.Username)

		// اضافه کردن کاربر به context
		c.Set("user", &user)
		c.Next()
	}
}
