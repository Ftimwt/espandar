package providers

import (
	"github.com/golang-jwt/jwt/v5"
	"time"
	"v/pkg/config"
)

type Jwt struct {
	secret string
}

func LoadJwt(cfg *config.App) *Jwt {
	return &Jwt{
		secret: cfg.Secret,
	}
}

func (j Jwt) CreateToken(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(j.secret)
}
