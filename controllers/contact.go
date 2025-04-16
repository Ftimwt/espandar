// controllers/contact.go
package controllers

import (
	"espandar/models"
	"fmt"
	"net/http"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ContactController struct {
	db *gorm.DB
}

func NewContactController(db *gorm.DB) *ContactController {
	return &ContactController{db: db}
}

// AddContact اضافه کردن کانتکت جدید
func (c *ContactController) AddContact(ctx *gin.Context) {
	var contact models.Contact

	// استخراج شناسه کاربر از توکن JWT
	tokenString := ctx.GetHeader("Authorization")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// بررسی نوع توکن
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte("secret"), nil // به جای "secret" کلید واقعی خود را قرار دهید
	})

	if err != nil { // بررسی خطای تجزیه توکن
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var userID uint
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if userIDValue, ok := claims["user_id"]; ok {
			switch v := userIDValue.(type) {
			case float64:
				userID = uint(v) // تبدیل به uint در صورتیکه نوع float64 باشد
			case int:
				userID = uint(v) // تبدیل به uint در صورتیکه نوع int باشد
			default:
				ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user_id type"})
				return
			}
		} else {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "user_id not found in claims"})
			return
		}
	} else {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := ctx.ShouldBindJSON(&contact); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	contact.UserID = userID // تنظیم شناسه کاربر

	if err := c.db.Create(&contact).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create contact"})
		return
	}

	ctx.JSON(http.StatusOK, contact)
}

// GetContacts دریافت لیست کانتکت‌ها
func (c *ContactController) GetContacts(ctx *gin.Context) {
	var contacts []models.Contact

	// استخراج شناسه کاربر از توکن JWT
	tokenString := ctx.GetHeader("Authorization")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte("secret"), nil // به جای "secret" کلید واقعی خود را قرار دهید
	})

	if err != nil { // بررسی خطای تجزیه توکن
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var userID uint
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID = uint(claims["user_id"].(float64))
	} else {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := c.db.Where("user_id = ?", userID).Find(&contacts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch contacts"})
		return
	}

	ctx.JSON(http.StatusOK, contacts)
}
