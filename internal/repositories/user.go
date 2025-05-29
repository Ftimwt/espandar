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
	tx := u.db.
		Joins("INNER JOIN channel_users ON channels.id = channel_users.channel_id").
		Where("channels.type = ?", models.ChannelTypePrivateChat).
		Where("channel_users.user_id = ?", user1ID).
		Where("channel_users.user_id = ?", user2ID).
		Find(&channel)
	return &channel, tx.Error
}

// SendMessage sends message
func (u User) SendMessage(userID, targetUser uint, message *models.Message) error {
	channel, err := u.GetPrivateChatChannel(userID, targetUser)
	if err != nil {
		return err
	}

	if channel.ID == 0 {
		channel = &models.Channel{
			Type: models.ChannelTypePrivateChat,
			Members: []models.User{
				{ID: userID},
				{ID: targetUser},
			},
		}
		if err := u.db.Create(channel).Error; err != nil {
			return err
		}
	}

	err = u.db.
		Model(&channel).
		Association("Messages").
		Append(message)

	return err
}

func (u User) GetMessages(userID, targetUser uint, limit, skip int) ([]models.Message, error) {
	channel, err := u.GetPrivateChatChannel(userID, targetUser)
	if err != nil {
		return nil, err
	}

	if channel.ID == 0 {
		return nil, nil
	}

	var messages []models.Message
	err = u.db.
		Joins("JOIN channel_chat_messages ccm ON ccm.message_id = messages.id").
		Where("ccm.channel_id = ?", channel.ID).
		Order("messages.id DESC").
		Limit(limit).
		Offset(skip).
		Preload("Files"). // optional: if you want to include file data
		Find(&messages).Error

	return messages, err
}
