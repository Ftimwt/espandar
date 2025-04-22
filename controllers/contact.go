package controllers

import (
	"espandar/models"
	"fmt"
	"net/http"

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
	fmt.Println("Received request to add contact") // لاگ‌گذاری
	// استخراج کاربر از کنتکست
	user, exists := ctx.Get("user")
	if !exists {
		fmt.Println("AddContact: User not found in context") // لاگ‌گذاری
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		fmt.Println("AddContact: Invalid user type in context") // لاگ‌گذاری
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
		return
	}

	// فقط ادمین‌ها مجاز به اضافه کردن مخاطب هستند
	if userModel.Role != "admin" {
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
	contact.UserID = userModel.ID

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
	// استخراج کاربر از کنتکست
	user, exists := ctx.Get("user")
	if !exists {
		fmt.Println("GetContacts: User not found in context") // لاگ‌گذاری
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		fmt.Println("GetContacts: Invalid user type in context") // لاگ‌گذاری
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
		return
	}

	var contacts []models.Contact
	if err := c.db.Where("user_id = ?", userModel.ID).Find(&contacts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch contacts"})
		return
	}

	ctx.JSON(http.StatusOK, contacts)
}
