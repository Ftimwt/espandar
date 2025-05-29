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

func (c Channel) SendMessage(id uint, user uint, message *models.Message) (*models.Message, error) {
	return message, c.db.
		Model(&models.Channel{ID: id}).
		Association("Messages").
		Append(message)
}
