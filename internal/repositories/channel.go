package repositories

import (
	"gorm.io/gorm"
	"v/pkg/models"
)

type ChannelI interface {
	Interface[models.Channel]
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

func (c Channel) Create(userID uint, name string, membersID []uint) (*models.Channel, error) {
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
