package repositories

import (
	"time"
	"v/pkg/models"

	"gorm.io/gorm"
)

type Group struct {
	db *gorm.DB
}

func NewGroup(db *gorm.DB) *Group {
	return &Group{
		db: db,
	}
}

func (repo Group) CreateGroup(userID uint, name, description string, membersID []uint) (*models.Channel, error) {
	members := make([]models.User, len(membersID)+1)
	members[0] = models.User{ID: userID}
	for i, memberID := range membersID {
		members[i+1] = models.User{ID: memberID}
	}

	channel := &models.Channel{
		Name:            name,
		CreatorID:       userID,
		Description:     description,
		Members:         members,
		Type:            models.ChannelTypeGroupChat,
		LastMessageTime: time.Now(),
	}
	return channel, repo.db.Create(channel).Error
}
