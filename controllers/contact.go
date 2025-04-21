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

func (c *ContactController) getUserIDFromToken(ctx *gin.Context) (uint, error) {
	tokenString := ctx.GetHeader("Authorization")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte("secret"), nil
	})

	if err != nil {
		return 0, fmt.Errorf("Unauthorized")
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return uint(claims["user_id"].(float64)), nil
	}
	return 0, fmt.Errorf("Unauthorized")
}

// AddContact اضافه کردن کانتکت جدید
func (c *ContactController) AddContact(ctx *gin.Context) {
	// استخراج userID از توکن JWT
	userID, err := c.getUserIDFromToken(ctx)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// بررسی نقش کاربر
	var user models.User
	if err := c.db.First(&user, userID).Error; err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// فقط ادمین‌ها مجاز به اضافه کردن مخاطب هستند
	if user.Role != "admin" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to add contacts"})
		return
	}

	// بایند کردن داده‌های ورودی
	var contact models.Contact
	if err := ctx.ShouldBindJSON(&contact); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// وابسته کردن کاربر به مخاطب
	contact.UserID = userID

	// ذخیره‌سازی مخاطب در پایگاه داده
	if err := c.db.Create(&contact).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create contact"})
		return
	}

	// بازگشت پاسخ
	ctx.JSON(http.StatusOK, contact)
}

// GetContacts دریافت لیست کانتکت‌ها
func (c *ContactController) GetContacts(ctx *gin.Context) {
	userID, err := c.getUserIDFromToken(ctx)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var contacts []models.Contact
	if err := c.db.Where("user_id = ?", userID).Find(&contacts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch contacts"})
		return
	}

	ctx.JSON(http.StatusOK, contacts)
}
