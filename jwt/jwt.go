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
		log.Fatal("InitJWT: jwt_secret is not set in environment variables")
	}
	log.Printf("InitJWT: JWT Secret loaded successfully: %s", jwtSecret)
}

func GetJWTSecret() []byte {
	log.Printf("GetJWTSecret: Returning jwt_secret: %s", jwtSecret)
	return jwtSecret
}

func Generate(user *models.User) (string, error) {
	log.Printf("Generate: Creating token for user ID: %d", user.ID)
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
		log.Printf("Generate: Error signing token: %v", err)
		return "", err
	}
	log.Printf("Generate: Token generated successfully for user ID: %d", user.ID)
	return signedToken, nil
}

func ValidateJWT(tokenString string) (uint, error) {
	if len(tokenString) < 10 {
		log.Printf("ValidateJWT: Token is too short: %s", tokenString)
		return 0, fmt.Errorf("invalid token")
	}
	log.Printf("ValidateJWT: Parsing token: %s...", tokenString[:10])
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			log.Printf("ValidateJWT: Unexpected signing method: %v", token.Header["alg"])
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		log.Printf("ValidateJWT: Using jwt_secret for validation: %s", jwtSecret)
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
		log.Printf("ValidateJWT: Token validated, userID: %d", userID)
		return userID, nil
	}

	log.Println("ValidateJWT: Invalid token claims")
	return 0, fmt.Errorf("invalid token")
}

func JWTAuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("JWTAuthMiddleware: Processing request: %s %s", c.Request.Method, c.Request.URL.String())
		authHeader := c.GetHeader("Authorization")
		tokenString := ""

		// بررسی هدر Authorization
		if authHeader != "" {
			log.Printf("JWTAuthMiddleware: Authorization header: %s", authHeader)
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
				log.Printf("JWTAuthMiddleware: Token from header: %s", tokenString[:10]+"...")
			} else {
				log.Println("JWTAuthMiddleware: Invalid authorization header format")
				c.JSON(401, gin.H{"error": "invalid authorization header"})
				c.Abort()
				return
			}
		} else {
			// بررسی query parameter برای WebSocket
			tokenString = c.Query("Authorization")
			log.Printf("JWTAuthMiddleware: Token from query: %s", tokenString)
			if tokenString == "" {
				log.Println("JWTAuthMiddleware: No authorization provided")
				c.JSON(401, gin.H{"error": "authorization is required"})
				c.Abort()
				return
			}
			// اگه توکن توی query با "Bearer " شروع می‌شه، اونو جدا کن
			if strings.HasPrefix(tokenString, "Bearer ") {
				tokenString = strings.TrimPrefix(tokenString, "Bearer ")
				log.Printf("JWTAuthMiddleware: Token after trimming Bearer: %s", tokenString[:10]+"...")
			}
		}

		userID, err := ValidateJWT(tokenString)
		if err != nil {
			log.Printf("JWTAuthMiddleware: Token validation failed: %v", err)
			c.JSON(401, gin.H{"error": err.Error()})
			c.Abort()
			return
		}
		log.Printf("JWTAuthMiddleware: Token validated, userID: %d", userID)

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			log.Printf("JWTAuthMiddleware: User not found for userID: %d, error: %v", userID, err)
			c.JSON(401, gin.H{"error": "user not found"})
			c.Abort()
			return
		}
		log.Printf("JWTAuthMiddleware: User found: ID=%d, Username=%s", user.ID, user.Username)

		c.Set("user", &user)
		c.Next()
	}
}
