package controllers

import (
	"espandar/jwt"
	"espandar/models"
	"espandar/utils"
	"fmt"
	"log"
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
	var input struct {
		Username string `json:"username"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		fmt.Println("SignUp: Invalid input:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// اعتبارسنجی شماره تلفن
	if !utils.ValidatePhone(input.Phone) {
		fmt.Println("SignUp: Invalid phone number:", input.Phone)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	// بررسی وجود کاربر با شماره تلفن
	var existingUser models.User
	if err := ac.db.Where("phone = ?", input.Phone).First(&existingUser).Error; err == nil {
		// بررسی اینکه آیا کاربر توسط ادمین ایجاد شده است
		defaultPassword := "default123"
		if bcrypt.CompareHashAndPassword([]byte(existingUser.Password), []byte(defaultPassword)) == nil {
			// کاربر توسط ادمین ایجاد شده است، اطلاعات را به‌روزرسانی می‌کنیم
			fmt.Println("SignUp: Found user created by admin, updating user:", input.Phone)
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
			if err != nil {
				fmt.Println("SignUp: Error hashing password:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
				return
			}

			existingUser.Username = input.Username
			existingUser.Password = string(hashedPassword)
			if err := ac.db.Save(&existingUser).Error; err != nil {
				fmt.Println("SignUp: Error updating user:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error updating user"})
				return
			}

			token, err := jwt.Generate(&existingUser)
			if err != nil {
				fmt.Println("SignUp: Error generating token:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
				return
			}

			fmt.Println("SignUp: User updated and logged in, token:", token)
			c.JSON(http.StatusOK, gin.H{"token": token})
			return
		} else {
			// کاربر وجود دارد و توسط ادمین ایجاد نشده است
			fmt.Println("SignUp: Phone number already exists:", input.Phone)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number already exists"})
			return
		}
	}

	// ایجاد کاربر جدید
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println("SignUp: Error hashing password:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	user := models.User{
		Username: input.Username,
		Phone:    input.Phone,
		Password: string(hashedPassword),
		Role:     "user",
	}

	if err := ac.db.Create(&user).Error; err != nil {
		fmt.Println("SignUp: Error creating user:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating user"})
		return
	}

	token, err := jwt.Generate(&user)
	if err != nil {
		fmt.Println("SignUp: Error generating token:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	fmt.Println("SignUp: User created, token:", token)
	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": user.ID,
	})
}

func (ac *AuthController) AdminSignUp(c *gin.Context) {
	var input struct {
		Username string `json:"username"`
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Println("AdminSignUp: Invalid input:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// اعتبارسنجی شماره تلفن
	if !utils.ValidatePhone(input.Phone) {
		log.Println("AdminSignUp: Invalid phone number:", input.Phone)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	// بررسی وجود کاربر با شماره تلفن
	var existingUser models.User
	if err := ac.db.Where("phone = ?", input.Phone).First(&existingUser).Error; err == nil {
		log.Println("AdminSignUp: Phone number already exists:", input.Phone)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number already exists"})
		return
	}

	// ادامه ایجاد کاربر جدید
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("AdminSignUp: Error hashing password:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error hashing password"})
		return
	}

	user := models.User{
		Username: input.Username,
		Phone:    input.Phone,
		Password: string(hashedPassword),
		Role:     "admin",
	}
	if err := ac.db.Create(&user).Error; err != nil {
		log.Println("AdminSignUp: Error creating admin:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error creating admin"})
		return
	}

	// ایجاد توکن
	token, err := jwt.Generate(&user)
	if err != nil {
		log.Println("AdminSignUp: Error generating token:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	log.Println("AdminSignUp: Admin created, token:", token)
	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": user.ID,
	})
}

func (ac *AuthController) Login(c *gin.Context) {
	var input struct {
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		fmt.Println("Login: Invalid input:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// اعتبارسنجی شماره تلفن
	if !utils.ValidatePhone(input.Phone) {
		fmt.Println("Login: Invalid phone number:", input.Phone)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	var user models.User
	if err := ac.db.Where("phone = ?", input.Phone).First(&user).Error; err != nil {
		fmt.Println("Login: User not found for phone:", input.Phone)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid phone number or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		fmt.Println("Login: Invalid password for phone:", input.Phone)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid phone number or password"})
		return
	}

	token, err := jwt.Generate(&user)
	if err != nil {
		fmt.Println("Login: Error generating token:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	fmt.Println("Login: User logged in, token:", token)
	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": user.ID,
	})
}

func (ac *AuthController) AdminLogin(c *gin.Context) {
	var input struct {
		Phone    string `json:"phone"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		fmt.Println("AdminLogin: Invalid input:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// اعتبارسنجی شماره تلفن
	if !utils.ValidatePhone(input.Phone) {
		fmt.Println("AdminLogin: Invalid phone number:", input.Phone)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number must be 11 digits starting with 09"})
		return
	}

	var user models.User
	if err := ac.db.Where("phone = ? AND role = ?", input.Phone, "admin").First(&user).Error; err != nil {
		fmt.Println("AdminLogin: Admin not found for phone:", input.Phone)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid phone number or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		fmt.Println("AdminLogin: Invalid password for phone:", input.Phone)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid phone number or password"})
		return
	}

	token, err := jwt.Generate(&user)
	if err != nil {
		fmt.Println("AdminLogin: Error generating token:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	fmt.Println("AdminLogin: Admin logged in, token:", token)
	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": user.ID,
	})
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
