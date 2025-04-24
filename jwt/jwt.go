package jwt

import (
	"errors"
	"espandar/models"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/caarlos0/env/v6"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

type Config struct {
	JwtSecret string `env:"jwt_secret"`
}

var jwtSecret []byte

func InitJWT() {
	cfg := Config{}
	if err := env.Parse(&cfg); err != nil {
		fmt.Fprintf(os.Stderr, "failed to load environment variables: %v\n", err)
		os.Exit(1)
	}
	jwtSecret = []byte(cfg.JwtSecret)
	fmt.Println("JWT Secret loaded:", cfg.JwtSecret) // لاگ‌گذاری
}

// GetJWTSecret برای دسترسی به jwtSecret از سایر پکیج‌ها
func GetJWTSecret() []byte {
	return jwtSecret
}

func Generate(user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "",
			Subject:   fmt.Sprintf("%d", user.ID),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24 * 30)),
			ID:        fmt.Sprintf("%d", user.ID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}
	return signedToken, nil
}

func ValidateJWT(tokenString string) (uint, error) {
	fmt.Println("ValidateJWT: Parsing token:", tokenString[:10]+"...")
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		fmt.Println("ValidateJWT: Signing method:", token.Method.Alg())
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			fmt.Println("ValidateJWT: Invalid signing method:", token.Method.Alg())
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		fmt.Println("ValidateJWT: Using jwtSecret:", string(jwtSecret))
		return jwtSecret, nil
	})

	if err != nil {
		fmt.Println("ValidateJWT: Parse error:", err)
		return 0, fmt.Errorf("failed to parse token: %v", err)
	}

	if !token.Valid {
		fmt.Println("ValidateJWT: Token is invalid")
		return 0, errors.New("forbidden")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		fmt.Println("ValidateJWT: Invalid claims")
		return 0, errors.New("invalid claims")
	}

	userID := claims.UserID
	fmt.Println("ValidateJWT: UserID:", userID)
	return userID, nil
}

func JWTAuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "authorization header is required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(401, gin.H{"error": "invalid authorization header"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		userID, err := ValidateJWT(tokenString)
		if err != nil {
			c.JSON(401, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			c.JSON(401, gin.H{"error": "user not found"})
			c.Abort()
			return
		}

		c.Set("user", &user)
		c.Next()
	}
}
