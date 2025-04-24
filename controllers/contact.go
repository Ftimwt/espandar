package controllers

import (
	"espandar/models"
	"espandar/utils"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type ContactController struct {
	db *gorm.DB
}

func NewContactController(db *gorm.DB) *ContactController {
	return &ContactController{db: db}
}

func (c *ContactController) AddContact(ctx *gin.Context) {
	fmt.Println("Received request to add contact")
	user, exists := ctx.Get("user")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
		return
	}

	if userModel.Role != "admin" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to add contacts"})
		return
	}

	var contact models.Contact
	if err := ctx.ShouldBindJSON(&contact); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// اعتبارسنجی شماره تلفن
	if !utils.ValidatePhone(contact.Phone) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	// بررسی وجود کاربر با شماره تلفن
	var existingUser models.User
	if err := c.db.Where("phone = ?", contact.Phone).First(&existingUser).Error; err != nil {
		// اگر کاربر وجود ندارد، کاربر جدید ایجاد می‌کنیم
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("default123"), bcrypt.DefaultCost)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
			return
		}

		newUser := models.User{
			Username: contact.Name,
			Phone:    contact.Phone,
			Password: string(hashedPassword),
			Role:     "user",
		}
		if err := c.db.Create(&newUser).Error; err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
			return
		}
		contact.UserID = newUser.ID
	} else {
		contact.UserID = existingUser.ID
	}

	contact.UserID = userModel.ID // تنظیم user_id برای ادمین که مخاطب را اضافه کرده
	if err := c.db.Create(&contact).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create contact"})
		return
	}

	ctx.JSON(http.StatusOK, contact)
}

func (c *ContactController) GetContacts(ctx *gin.Context) {
	user, exists := ctx.Get("user")
	if !exists {
		fmt.Println("GetContacts: User not found in context")
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		fmt.Println("GetContacts: Invalid user type in context")
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
		return
	}

	var contacts []models.Contact
	if userModel.Role == "admin" {
		if err := c.db.Where("user_id = ?", userModel.ID).Find(&contacts).Error; err != nil {
			fmt.Println("GetContacts: Error fetching contacts for admin:", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch contacts"})
			return
		}
	} else {
		var adminUsers []models.User
		if err := c.db.Where("role = ?", "admin").Find(&adminUsers).Error; err != nil {
			fmt.Println("GetContacts: Error fetching admin users:", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch admin users"})
			return
		}

		var adminIDs []uint
		for _, admin := range adminUsers {
			adminIDs = append(adminIDs, admin.ID)
		}

		if len(adminIDs) == 0 {
			fmt.Println("GetContacts: No admin users found, returning empty contacts")
			ctx.JSON(http.StatusOK, contacts)
			return
		}
		if err := c.db.Where("user_id IN ?", adminIDs).Find(&contacts).Error; err != nil {
			fmt.Println("GetContacts: Error fetching contacts for user:", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch contacts"})
			return
		}
	}

	fmt.Println("GetContacts: Returning contacts:", contacts)
	ctx.JSON(http.StatusOK, contacts)
}
