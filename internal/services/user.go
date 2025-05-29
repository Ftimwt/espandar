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

// Signup creates a new user and returns a JWT token for that user.
//
// It first checks if the desired username is already taken. If the username
// is already taken, it returns DuplicateUsernameErr.
//
// It then hashes the password and creates the user in the repository. If
// there is an error while creating the user, it is returned.
//
// If the user is successfully created, it creates a JWT token for that user
// and returns the token. If there is an error while creating the token, it is
// returned.
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

// comparePassword compares the hashed password from a user object with a target
// password.
//
// Returns true if the target password matches the hashed password, and false
// otherwise. If there is an error that is not ErrMismatchedHashAndPassword,
// returns the error.
func (u User) comparePassword(user *models.User, targetPass string) (bool, error) {
	bPass := []byte(user.Password)
	err := bcrypt.CompareHashAndPassword(bPass, []byte(targetPass))
	if err != nil && !errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		return false, err
	}
	return err == nil, nil
}

// Login checks user credentials and returns a JWT token for the user.
//
// If the username or password is incorrect, it returns UsernamePasswordIncorrect.
// If the user does not exist, it returns UsernamePasswordIncorrect.
// If there is an error while checking the user credentials or creating the token,
// it returns that error.
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

func (u User) FindUserByID(id uint) (*models.User, error) {
	return u.repo.GetUserByID(id)
}
