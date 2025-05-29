package services

import (
	"v/internal/dto"
	"v/internal/repositories"
	"v/pkg/models"
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
	return c.repo.Create(userID, create.Name, create.Members)
}

func (c Channel) List() ([]models.Channel, error) {
	return c.repo.List()
}
