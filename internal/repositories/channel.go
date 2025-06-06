package repositories

import (
	"gorm.io/gorm"
	"v/pkg/models"
)

type ChannelI interface {
	Interface[models.Channel]
	CreateByUserID(userID uint, name string, membersID []uint) (*models.Channel, error)
	GetUserChannels(userID uint) ([]models.Channel, error)
}

type Channel struct {
	*Repository[models.Channel]
	db *gorm.DB
}

func NewChannel(db *gorm.DB) *Channel {
	return &Channel{
		Repository: NewRepository[models.Channel](db),
		db:         db,
	}
}

func (c Channel) CreateByUserID(userID uint, name string, membersID []uint) (*models.Channel, error) {
	members := make([]models.User, len(membersID))

	for i, id := range membersID {
		members[i] = models.User{
			ID: id,
		}
	}

	channel := models.Channel{
		ID:        0,
		Name:      name,
		CreatorID: userID,
		Members:   members,
	}

	if err := c.db.Create(&channel).Error; err != nil {
		return nil, err
	}

	return &channel, nil
}

func (c Channel) List() ([]models.Channel, error) {
	var channels []models.Channel
	if err := c.db.Preload("Members").Preload("Creator").Find(&channels).Error; err != nil {
		return nil, err
	}
	return channels, nil
}

func (c Channel) GetUserChannels(userID uint) ([]models.Channel, error) {
	var channels []models.Channel

	err := c.db.
		Joins("JOIN channel_users ON channel_users.channel_id = channels.id").
		Where("channel_users.user_id = ? OR channels.creator_id = ?", userID, userID).
		Preload("Creator").
		Find(&channels).Error

	if err != nil {
		return nil, err
	}

	return channels, nil
}

// SendMessage sends message
func (c Channel) SendMessage(senderID, channelID uint, message string, files []models.File) (*models.Message, error) {
	channel := &models.Channel{
		ID: channelID,
	}

	msg := &models.Message{
		Text:     message,
		Files:    files,
		SenderID: senderID,
	}

	err := c.db.
		Model(&channel).
		Association("Messages").
		Append(msg)

	return msg, err
}

// GetMessages returns messages
func (u Channel) GetMessages(channelID uint, limit, skip int) ([]models.Message, error) {
	var messages []models.Message
	err := u.db.
		Joins("JOIN channel_chat_messages ccm ON ccm.message_id = messages.id").
		Where("ccm.channel_id = ?", channelID).
		Order("messages.id DESC").
		Preload("Sender").
		Limit(limit).
		Offset(skip).
		Preload("Files"). // optional: if you want to include file data
		Find(&messages).Error

	return messages, err
}

func (c Channel) GetUsersInChannelByID(channelID uint) ([]models.User, error) {
	var users []models.User
	if err := c.db.
		Joins("JOIN channel_users ON channel_users.user_id = users.id").
		Where("channel_users.channel_id = ?", channelID).
		Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}
