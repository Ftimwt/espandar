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
	if ctx.Request.Method != "POST" {
		fmt.Println("AddContact: Invalid method:", ctx.Request.Method)
		ctx.JSON(http.StatusMethodNotAllowed, gin.H{"error": "Method not allowed"})
		return
	}

	user, exists := ctx.Get("user")
	if !exists {
		fmt.Println("AddContact: User not found in context")
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	userModel, ok := user.(*models.User)
	if !ok {
		fmt.Println("AddContact: Invalid user type")
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user"})
		return
	}

	if userModel.Role != "admin" {
		fmt.Println("AddContact: User is not admin, ID:", userModel.ID)
		ctx.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to add contacts"})
		return
	}

	var contact models.Contact
	if err := ctx.ShouldBindJSON(&contact); err != nil {
		fmt.Println("AddContact: Invalid input:", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if contact.Name == "" || contact.Phone == "" {
		fmt.Println("AddContact: Name or phone missing")
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name and phone are required"})
		return
	}

	if !utils.ValidatePhone(contact.Phone) {
		fmt.Println("AddContact: Invalid phone number:", contact.Phone)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	var existingContact models.Contact
	if err := c.db.Where("phone = ? AND user_id = ?", contact.Phone, userModel.ID).First(&existingContact).Error; err == nil {
		fmt.Println("AddContact: Contact already exists for phone:", contact.Phone)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Contact with this phone number already exists"})
		return
	}

	var existingUser models.User
	if err := c.db.Where("phone = ?", contact.Phone).First(&existingUser).Error; err != nil {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("default123"), bcrypt.DefaultCost)
		if err != nil {
			fmt.Println("AddContact: Error hashing password:", err)
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
			fmt.Println("AddContact: Error creating user:", err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
			return
		}
		contact.TargetID = newUser.ID
		fmt.Println("AddContact: Created new user with ID:", newUser.ID)
	} else {
		contact.TargetID = existingUser.ID
		fmt.Println("AddContact: Using existing user with ID:", existingUser.ID)
	}

	contact.UserID = userModel.ID
	if err := c.db.Create(&contact).Error; err != nil {
		fmt.Println("AddContact: Error creating contact:", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create contact"})
		return
	}

	fmt.Println("AddContact: Contact created successfully, ID:", contact.ID)
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

	// برگرداندن TargetID به جای UserID برای چت
	for i, contact := range contacts {
		contacts[i].UserID = contact.TargetID // برای استفاده در handleContactClick
		var targetUser models.User
		if err := c.db.Where("id = ?", contact.TargetID).First(&targetUser).Error; err == nil {
			contacts[i].Name = targetUser.Username
			contacts[i].Phone = targetUser.Phone
		}
	}

	fmt.Println("GetContacts: Returning contacts:", contacts)
	ctx.JSON(http.StatusOK, contacts)
}
