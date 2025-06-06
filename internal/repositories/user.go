package repositories

import (
	"gorm.io/gorm"
	"time"
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

func (u User) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	tx := u.db.
		Where("id=?", id).
		Find(&user)

	if err := tx.Error; err != nil {
		return nil, err
	}

	if user.ID == 0 {
		return nil, nil
	}

	return &user, nil
}

func (u User) GetUsers() ([]models.User, error) {
	var users []models.User
	tx := u.db.Find(&users)
	return users, tx.Error
}

// GetPrivateChatChannel returns private chat channel
func (u User) GetPrivateChatChannel(user1ID uint, user2ID uint) (*models.Channel, error) {
	var channel models.Channel

	err := u.db.Raw(`
  SELECT c.*
  FROM channels c
  JOIN channel_users cu ON cu.channel_id = c.id
  WHERE cu.user_id IN (?, ?)
  GROUP BY c.id
  HAVING COUNT(DISTINCT cu.user_id) = 2
`, user1ID, user2ID).Find(&channel).Error

	if err != nil {
		return nil, err
	}
	if channel.ID == 0 {
		channel = models.Channel{
			CreatorID: user1ID,
			Members: []models.User{
				{ID: user1ID},
				{ID: user2ID},
			},
			Type:            models.ChannelTypePrivateChat,
			LastMessageTime: time.Now(),
		}
		if err := u.db.Create(&channel).Error; err != nil {
			return nil, err
		}
	}

	return &channel, nil
}

// SendMessage sends message
func (u User) SendMessage(userID, targetUser uint, message *models.Message) error {
	channel, err := u.GetPrivateChatChannel(userID, targetUser)
	if err != nil {
		return err
	}

	if channel.ID == 0 {
	}

	err = u.db.
		Model(&channel).
		Association("Messages").
		Append(message)

	return err
}

type UsersListOption struct {
	Limit       int
	Offset      int
	Order       string
	Query       string
	CurrentUser uint
}

// GetUsersList lists users from database
func (u User) GetUsersList(option UsersListOption) ([]models.User, error) {
	var users []models.User
	tx := u.db.
		Limit(option.Limit).Offset(option.Offset)

	if option.CurrentUser != 0 {
		tx.Where("id != ?", option.CurrentUser)
	}
	if option.Query != "" {
		tx.Where("concat(username, firstname, lastname) like \"%$1%\"", option.Query)
	}
	if option.Order != "" {
		tx.Order(option.Order)
	}

	return users, tx.Find(&users).Error
}
