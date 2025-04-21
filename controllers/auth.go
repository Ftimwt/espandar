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

// AdminSignUp - ثبت‌نام ادمین
func (ac *AuthController) AdminSignUp(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	// چک کردن وجود کاربر
	if err := ac.db.Where("username = ? OR email = ?", user.Username, user.Email).First(&user).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "username or email already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error hashing password"})
		return
	}
	user.Password = string(hashedPassword)
	user.Role = "admin" // تنظیم نقش کاربر به 'admin'

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
		"message": "admin registered successfully",
		"token":   token,
	})
}

// SignUp - ثبت‌نام کاربر عادی
func (ac *AuthController) SignUp(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	// چک کردن وجود کاربر ادمین
	var existingAdmin models.User
	if err := ac.db.Where("role = ?", "admin").First(&existingAdmin).Error; err == nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin user already exists, cannot register as a normal user"})
		return
	}

	// چک کردن وجود کاربر
	if err := ac.db.Where("username = ? OR email = ?", user.Username, user.Email).First(&user).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "username or email already exists"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error hashing password"})
		return
	}
	user.Password = string(hashedPassword)
	user.Role = "user" // تنظیم نقش کاربر به 'user'

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

// AdminLogin - ورود ادمین
func (ac *AuthController) AdminLogin(c *gin.Context) {
	var user struct {
		Username string `json:"username"`
		Password string `json:"-"`
	}

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	var storedUser models.User
	result := ac.db.Where("username=? AND role=?", user.Username, "admin").First(&storedUser)
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

// Login - ورود کاربر عادی
func (ac *AuthController) Login(c *gin.Context) {
	var user struct {
		Username string `json:"username"`
		Password string `json:"-"`
	}

	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	var storedUser models.User
	result := ac.db.Where("username=? AND role=?", user.Username, "user").First(&storedUser)
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

// GetProfile - دریافت پروفایل کاربر
func (ac *AuthController) GetProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var user models.User
	if err := ac.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user) // بازگشت اطلاعات کاربر
}

// UpdateProfile - به‌روزرسانی پروفایل کاربر
func (ac *AuthController) UpdateProfile(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	// اگر رمز عبور جدیدی وارد شده باشد، آن را هش کنید
	if user.Password != "" {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err == nil {
			user.Password = string(hashedPassword)
		}
	}

	if err := ac.db.Model(&models.User{}).Where("id=?", userID).Updates(user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "error updating profile"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

// SignOut - خروج از سیستم
func (ac *AuthController) SignOut(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "user signed out"})
}

// AddUser - اضافه کردن کاربر جدید (فقط برای ادمین)
func (ac *AuthController) AddUser(c *gin.Context) {
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
	user.Role = "user" // می‌توانید نقش را بر اساس نیاز تغییر دهید

	result := ac.db.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user added successfully"})
}

// GetUsers - دریافت لیست کاربران (برای ادمین و کاربران عادی)
func (ac *AuthController) GetUsers(c *gin.Context) {
	var users []models.User
	if err := ac.db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

// DeleteUser - حذف کاربر (فقط برای ادمین)
func (ac *AuthController) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	if err := ac.db.Delete(&models.User{}, userID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "error deleting user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "user deleted"})
}

// UpdateUser - به‌روزرسانی اطلاعات کاربر (فقط برای ادمین)
func (ac *AuthController) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	if err := ac.db.Model(&models.User{}).Where("id=?", userID).Updates(user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "error updating user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "user updated"})
}

// GetUserByID - دریافت اطلاعات خاص یک کاربر (فقط برای ادمین)
func (ac *AuthController) GetUserByID(c *gin.Context) {
	userID := c.Param("id")
	var user models.User
	if err := ac.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}
