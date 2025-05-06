package mapper

import (
	"espandar/dto"
	"espandar/models"
)

func ToUserModel(user models.User) dto.UserModel {
	return dto.UserModel{
		ID:       user.ID,
		Username: user.Username,
		Phone:    user.Phone,
		Role:     user.Role,
	}
}

func ToUsersModels(users []models.User) []dto.UserModel {
	userList := make([]dto.UserModel, len(users))
	for i, user := range users {
		userList[i] = ToUserModel(user)
	}
	return userList
}
