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
	return token.SignedString([]byte(j.secret))
}

func (j Jwt) ParseToken(token string) (*jwt.Token, error) {
	return jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(j.secret), nil
	})
}
