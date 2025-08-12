package mapper

import (
	"v/internal/dto"
	"v/pkg/models"
)

func ToUsersDTO(users []models.User) []dto.User {
	userDTOs := make([]dto.User, len(users))
	for i, user := range users {
		userDTOs[i] = ToUserDTO(user)
	}
	return userDTOs
}

func ToUserDTO(user models.User) dto.User {
	return dto.User{
		ID:        user.ID,
		Username:  user.Username,
		Firstname: user.Firstname,
		Lastname:  user.Lastname,
	}
}
