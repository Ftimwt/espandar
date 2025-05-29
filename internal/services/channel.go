package services

import (
	"errors"
	"v/internal/dto"
	"v/internal/repositories"
	"v/pkg/models"
)

var (
	ErrChannelNotFound = errors.New("channel not found")
)

type Channel struct {
	repo *repositories.Channel
}

func NewChannel(repo *repositories.Channel) *Channel {
	return &Channel{
		repo: repo,
	}
}

func (c Channel) Create(userID uint, create dto.ChannelCreate) (*models.Channel, error) {
	return c.repo.CreateByUserID(userID, create.Name, create.Members)
}

// GetUserChannels List retrieves all channels from the repository.
// It returns a slice of Channel models and an error if any occurs during retrieval.
func (c Channel) GetUserChannels(userID uint) ([]models.Channel, error) {
	return c.repo.GetUserChannels(userID)
}

// FindChannelByID retrieves a channel by its ID from the repository.
// It returns a pointer to the Channel model and an error if any occurs during retrieval.
func (c Channel) FindChannelByID(id uint) (*models.Channel, error) {
	return c.repo.Get(id)
}

// SendMessage sends a message to a channel.
// It returns an error if any occurs during the operation.
func (c Channel) SendMessage(userID, channelID uint, messageDTO *dto.Message) (*models.Message, error) {
	var message = &models.Message{
		Text:     messageDTO.Text,
		Files:    nil,
		SenderID: userID,
	}
	channel, err := c.FindChannelByID(channelID)
	if err != nil {
		return nil, err
	}
	if channel == nil {
		return nil, ErrChannelNotFound
	}

	return c.repo.SendMessage(userID, channelID, message)
}
