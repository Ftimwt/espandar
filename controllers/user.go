// controllers/user_controller.go
package controllers

import (
	"espandar/models"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserController struct {
	db *gorm.DB
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{db: db}
}

// GetUserByID اطلاعات یک کاربر خاص را بر اساس ID برمی‌گرداند
func (uc *UserController) GetUserByID(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := uc.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("GetUserByID: User not found, ID: %s", userID)
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		} else {
			log.Printf("GetUserByID: Error retrieving user, ID: %s, error: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error retrieving user"})
		}
		return
	}

	// فقط فیلدهای ضروری را برگردانید (برای امنیت)
	c.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
	})
}

// controllers/user_controller.go
func (uc *UserController) GetUsers(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		log.Printf("GetUsers: User not found in context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}
	userModel, ok := user.(*models.User)
	if !ok {
		log.Printf("GetUsers: Invalid user type in context")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user type"})
		return
	}

	var users []models.User
	if err := uc.db.Where("id != ?", userModel.ID).Find(&users).Error; err != nil {
		log.Printf("GetUsers: Error retrieving users, error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error retrieving users"})
		return
	}

	// محدود کردن فیلدهای ارسالی
	response := make([]gin.H, len(users))
	for i, u := range users {
		response[i] = gin.H{
			"id":       u.ID,
			"username": u.Username,
		}
	}

	c.JSON(http.StatusOK, response)
}
