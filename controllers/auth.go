package controllers

import (
	"espandar/jwt"
	"espandar/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthController struct {
	db *gorm.DB
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{db: db}
}

func (ac *AuthController) SignUp(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error hashing password"})
		return
	}
	user.Password = string(hashedPassword)

	result := ac.db.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating user"})
		return
	}

	token, err := jwt.Generate(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generating token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "user registered successfully",
		"token":   token,
	})
}

func (ac *AuthController) Login(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}
	var storedUser models.User
	result := ac.db.Where("username=?", user.Username).First(&storedUser)
	if result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(user.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	token, err := jwt.Generate(&storedUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error generating token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (ac *AuthController) GetProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var user models.User
	if err := ac.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "login successful"})
}

func (ac *AuthController) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	if err := ac.db.Model(&user).Where("id=?", userID).Updates(user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "error updating profile"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile update"})
}

func (ac *AuthController) GetUsers(c *gin.Context) {
	var users []models.User
	if err := ac.db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (ac *AuthController) SignOut(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "user sign out"})
}
