package services

import (
	log "github.com/sirupsen/logrus"
	"v/internal/repositories"
	"v/pkg/models"
)

type ChatI interface {
	LatestChats(userID uint, option LatestChatsOption) ([]models.Channel, error)
}

type Chat struct {
	repo   repositories.ChatI
	logger *log.Entry
}

func NewChat(repo repositories.ChatI) *Chat {
	return &Chat{
		repo: repo,
		logger: log.WithFields(log.Fields{
			"service": "chat",
		}),
	}
}

type LatestChatsOption struct {
	Limit  int
	Offset int
}

// LatestChats retrieves a list of the latest chat channels from the repository.
// It accepts pagination options via the LatestChatsOption parameter, which includes Limit and Offset.
// It returns a slice of models.Channel, or an error if any occurs during retrieval.
func (c Chat) LatestChats(userID uint, option LatestChatsOption) ([]models.Channel, error) {
	chats, err := c.repo.LatestChats(userID, repositories.LatestChatsOption{
		Limit:  option.Limit,
		Offset: option.Offset,
	})

	if err != nil {
		c.logger.WithError(err).Error("error getting latest chats")
		return nil, err
	}

	return chats, nil
}
