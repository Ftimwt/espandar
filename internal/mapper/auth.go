package mapper

import (
	"v/internal/dto"
	"v/pkg/models"
)

func FromSignupRequest(request dto.SignupRequest) *models.User {
	return &models.User{
		Username:  request.Username,
		Password:  request.Password,
		Firstname: request.Firstname,
		Lastname:  request.Lastname,
	}
}
