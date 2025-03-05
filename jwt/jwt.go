package jwt

import (
	"errors"
	"espandar/models"
	"fmt"
	"os"
	"github.com/caarlos0/env/v6"
	"github.com/golang-jwt/jwt/v5"
	"time"
)

type Claims struct {
	UserID uint `json:"user_id"`
	jwt.RegisteredClaims
}

type Config struct {
	JwtSecret string `env:"jwt_secret"`
}

var jwtSecret []byte

func init() {
	cfg := Config{}
	if err := env.Parse(&cfg); err != nil {
		fmt.Fprintf(os.Stderr, "failed to load environment variables: %v\n", err)
		os.Exit(1)
	}
	jwtSecret = []byte(cfg.JwtSecret)
}

func Generate(user *models.User) (string, error) {
	// Define token claims
	claims := Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "",
			Subject:   fmt.Sprintf("%d", user.ID),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24)), // Expires in 24 hours
			ID:        fmt.Sprintf("%d", user.ID),
		},
	}

	// Create a new token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token with the secret key
	signedToken, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	return signedToken, nil
}

// ValidateJWT validates and parses the JWT token
func ValidateJWT(tokenString string) (uint, error) {
	// Parse the token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Verify the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unauthorized")
		}
		return jwtSecret, nil
	})

	if err != nil {
		return 0, err
	}

	// Check if the token is valid
	if !token.Valid {
		return 0, errors.New("forbidden")
	}

	claim, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("forbidden")
	}

	return uint(claim["user_id"].(float64)), nil
}
