package services

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
	"v/internal/repositories"
	"v/pkg/models"
	"v/pkg/providers"
)

var (
	DuplicateUsernameErr      = errors.New("username already exists")
	UsernamePasswordIncorrect = errors.New("username or password was incorrect")
)

type User struct {
	repo *repositories.User
	jwt  *providers.Jwt
}

func NewUser(repo *repositories.User, jwt *providers.Jwt) *User {
	return &User{
		repo: repo,
		jwt:  jwt,
	}
}

func (u User) checkDuplicateUsername(username string) error {
	isExists, err := u.repo.IsUsernameExists(username)
	if err != nil {
		return err
	}
	if isExists {
		return DuplicateUsernameErr
	}
	return nil
}

func (u User) hashPassword(user *models.User) error {
	bPass, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	user.Password = string(bPass)
	return err
}

func (u User) Signup(user *models.User) (token string, err error) {
	if err := u.checkDuplicateUsername(user.Username); err != nil {
		return "", err
	}

	if err := u.hashPassword(user); err != nil {
		return "", err
	}

	if err := u.repo.Create(user); err != nil {
		return "", err
	}

	token, err = u.jwt.CreateToken(user.ID)
	if err != nil {
		return "", err
	}

	return token, nil
}

func (u User) comparePassword(user *models.User, targetPass string) (bool, error) {
	bPass := []byte(user.Password)
	err := bcrypt.CompareHashAndPassword(bPass, []byte(targetPass))
	if err != nil && !errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return false, err
	}
	return err == nil, nil
}

func (u User) Login(username string, password string) (*models.User, string, error) {
	user, err := u.repo.GetUserByUsername(username)
	if err != nil {
		return nil, "", err
	}
	if user == nil {
		return nil, "", UsernamePasswordIncorrect
	}
	ok, err := u.comparePassword(user, password)
	if err != nil {
		return nil, "", err
	}
	if !ok {
		return nil, "", UsernamePasswordIncorrect
	}

	token, err := u.jwt.CreateToken(user.ID)
	if err != nil {
		return nil, "", err
	}

	return user, token, nil
}
