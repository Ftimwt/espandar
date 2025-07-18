package services

import (
	"fmt"
	log "github.com/sirupsen/logrus"
	"v/internal/dto"
	"v/internal/repositories"
	"v/pkg/models"
)

type Group struct {
	repo        *repositories.Group
	repoUser    *repositories.User
	repoChannel *repositories.Channel
	chanService *Channel
}

func NewGroup(chanService *Channel, repo *repositories.Group, repoChannel *repositories.Channel, repoUser *repositories.User) *Group {
	return &Group{
		chanService: chanService,
		repo:        repo,
		repoChannel: repoChannel,
		repoUser:    repoUser,
	}
}

func (g Group) CreateGroup(userID uint, name, description string, membersID []uint) (*models.Channel, error) {
	group, err := g.repo.CreateGroup(userID, name, description, membersID)
	if err != nil {
		return nil, err
	}

	user, err := g.repoUser.GetUserByID(userID)
	username := "unknown"
	if err != nil {
		log.Warnf("user not found: %s", err)
	} else {
		username = user.Username
	}

	_, err = g.repoChannel.SendAlert(group.ID, fmt.Sprintf("New group created by %s", username))
	if err != nil {
		log.Warnf("failed to send alert: %s", err)
	}
	return group, nil
}

func (g Group) GetMessages(userID, channelID uint, limit int, skip int) ([]models.Message, error) {
	// TODO: check user access
	return g.repoChannel.GetMessages(channelID, limit, skip)
}

func (g Group) FindGroupByID(userID uint, groupID uint) (*models.Channel, error) {
	// TODO: check user access
	return g.repoChannel.Get(groupID)
}

func (g Group) SendMessage(userID uint, channelID uint, msg *dto.Message) (*models.Message, error) {
	// TODO: check user access
	return g.chanService.SendMessage(userID, channelID, msg)
}

func (g Group) MarkAsRead(userID uint, channelID uint) (int64, error) {
	// TODO: check user access
	return g.chanService.MarkAllAsRead(userID, channelID)
}
