package repositories

import (
	"gorm.io/gorm"
	"v/pkg/models"
)

type ChatI interface {
	LatestChats(option LatestChatsOption) ([]models.Channel, error)
}

type Chat struct {
	db *gorm.DB
}

func NewChat(db *gorm.DB) *Chat {
	return &Chat{
		db,
	}
}

type LatestChatsOption struct {
	Limit  int
	Offset int
}

// LatestChats retrieves the latest chat channels from the database based on the provided options.
// It supports pagination via Limit and Offset, and sorts the results by the last message time in descending order.
func (c Chat) LatestChats(option LatestChatsOption) ([]models.Channel, error) {
	var channels []models.Channel

	// Query the database for channels with pagination and ordering
	err := c.db.
		Limit(option.Limit).
		Offset(option.Offset).
		Order("last_message_time desc").
		Find(&channels).Error

	return channels, err
}
