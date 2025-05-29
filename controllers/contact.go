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
	fmt.Println("AddContact: Received request to add contact")

	user, exists := ctx.Get("user")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	userModel, ok := user.(*models.User)
	if !ok || userModel.Role != "admin" {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to add contacts"})
		return
	}

	var contact models.Contact
	if err := ctx.ShouldBindJSON(&contact); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if contact.Name == "" || contact.Phone == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name and phone are required"})
		return
	}

	if !utils.ValidatePhone(contact.Phone) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	// بررسی کاربر موجود با شماره تلفن
	var existingUser models.User
	if err := c.db.Where("phone = ?", contact.Phone).First(&existingUser).Error; err != nil {
		// ایجاد کاربر جدید
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
		existingUser = newUser
	}

	// گرفتن همه کاربران (به‌جز خودش)
	var allUsers []models.User
	if err := c.db.Find(&allUsers).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching users"})
		return
	}

	for _, u := range allUsers {
		if u.ID == existingUser.ID {
			continue
		}

		// افزودن مخاطب جدید برای بقیه کاربران
		var exists1 models.Contact
		if err := c.db.Where("user_id = ? AND target_id = ?", u.ID, existingUser.ID).First(&exists1).Error; err == gorm.ErrRecordNotFound {
			c.db.Create(&models.Contact{
				UserID:   u.ID,
				TargetID: existingUser.ID,
				Name:     existingUser.Username,
				Phone:    existingUser.Phone,
			})
		}

		// افزودن دیگر کاربران برای مخاطب جدید
		var exists2 models.Contact
		if err := c.db.Where("user_id = ? AND target_id = ?", existingUser.ID, u.ID).First(&exists2).Error; err == gorm.ErrRecordNotFound {
			c.db.Create(&models.Contact{
				UserID:   existingUser.ID,
				TargetID: u.ID,
				Name:     u.Username,
				Phone:    u.Phone,
			})
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message":  "Contact added and synced for all users",
		"user_id":  existingUser.ID,
		"username": existingUser.Username,
	})
}

func (c *ContactController) GetContacts(ctx *gin.Context) {
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

	var contacts []models.Contact
	if err := c.db.Where("user_id = ?", userModel.ID).Find(&contacts).Error; err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not fetch contacts"})
		return
	}

	// نمایش ادمین‌ها برای کاربران غیر ادمین (اگر هنوز اضافه نشده باشند)
	if userModel.Role != "admin" {
		var adminUsers []models.User
		if err := c.db.Where("role = ?", "admin").Find(&adminUsers).Error; err == nil {
			for _, admin := range adminUsers {
				if admin.ID != userModel.ID {
					// بررسی تکراری نبودن
					found := false
					for _, contact := range contacts {
						if contact.TargetID == admin.ID {
							found = true
							break
						}
					}
					if !found {
						contacts = append(contacts, models.Contact{
							ID:       0,
							UserID:   userModel.ID,
							TargetID: admin.ID,
							Name:     admin.Username,
							Phone:    admin.Phone,
						})
					}
				}
			}
		}
	}

	// به‌روزرسانی فقط name و phone از جدول User (نه UserID!)
	for i, contact := range contacts {
		var targetUser models.User
		if err := c.db.First(&targetUser, contact.TargetID).Error; err == nil {
			contacts[i].Name = targetUser.Username
			contacts[i].Phone = targetUser.Phone
			// ❌ هرگز مقدار contacts[i].UserID را تغییر نده!

			contacts[i].ProfileImage = targetUser.ProfileImage
			contacts[i].IsOnline = targetUser.IsOnline
		}
	}

	ctx.JSON(http.StatusOK, contacts)
}
