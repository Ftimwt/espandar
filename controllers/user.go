package controllers

import (
	"espandar/models"
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

func (uc *UserController) GetUsers(c *gin.Context) {
	user, _ := c.MustGet("user").(*models.User)

	var users []models.User
	if err := uc.db.Where("id != ?", user.ID).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error retrieving users"})
		return
	}

	c.JSON(http.StatusOK, users)
}
