package jwt

import (
	"espandar/models"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

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
	jwtSecret = []byte(os.Getenv("jwt_secret"))
	if len(jwtSecret) == 0 {
		log.Fatal("JWT secret is not set")
	}
	log.Printf("JWT Secret loaded: %s", jwtSecret)
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
	if len(tokenString) < 10 {
		log.Printf("ValidateJWT: Token is too short: %s", tokenString)
		return 0, fmt.Errorf("invalid token")
	}
	log.Printf("ValidateJWT: Parsing token: %s", tokenString[:10]+"...")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Printf("ValidateJWT: Unexpected signing method: %v", token.Header["alg"])
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})
	if err != nil {
		log.Printf("ValidateJWT: Error parsing token: %v", err)
		return 0, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userIDFloat, ok := claims["user_id"].(float64)
		if !ok {
			log.Println("ValidateJWT: user_id not found or invalid in claims")
			return 0, fmt.Errorf("user_id not found in claims")
		}
		userID := uint(userIDFloat)
		log.Printf("ValidateJWT: UserID: %d", userID)
		return userID, nil
	}

	log.Println("ValidateJWT: Invalid token claims")
	return 0, fmt.Errorf("invalid token")
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
