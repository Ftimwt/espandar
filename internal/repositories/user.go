package repositories

import (
	"gorm.io/gorm"
	"v/pkg/models"
)

type User struct {
	db *gorm.DB
}

func NewUser(db *gorm.DB) *User {
	return &User{db}
}

func (u User) Create(model *models.User) error {
	return u.db.Create(&model).Error
}

// IsUsernameExists check is username exists in database
func (u User) IsUsernameExists(username string) (bool, error) {
	var exists bool
	tx := u.db.
		Table("users").
		Select("1=1").
		Where("username=?", username).
		Find(&exists)
	return exists, tx.Error
}

func (u User) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	tx := u.db.
		Where("username=?", username).
		Find(&user)

	if err := tx.Error; err != nil {
		return nil, err
	}

	if user.ID == 0 {
		return nil, nil
	}

	return &user, nil
}
