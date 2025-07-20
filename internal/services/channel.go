package services

import (
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v2/log"
	"v/internal/dto"
	"v/internal/repositories"
	"v/pkg/models"
	"v/pkg/providers"
)

var (
	ErrChannelNotFound = errors.New("channel not found")
)

type Channel struct {
	repo     *repositories.Channel
	notifier *providers.Notifier
}

func NewChannel(repo *repositories.Channel, notifier *providers.Notifier) *Channel {
	return &Channel{
		repo:     repo,
		notifier: notifier,
	}
}

func (c Channel) Create(userID uint, create dto.ChannelCreate) (*models.Channel, error) {
	channel, err := c.repo.CreateByUserID(userID, create.Name, create.Members)
	if err != nil {
		return nil, err
	}
	_, err = c.repo.SendAlert(channel.ID, fmt.Sprintf("New channel created by %s", create.Name))
	if err != nil {
		log.Error(err)
	}

	return channel, nil
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
	channel, err := c.FindChannelByID(channelID)
	if err != nil {
		return nil, err
	}
	if channel == nil {
		return nil, ErrChannelNotFound
	}

	users, err := c.repo.GetUsersInChannelByID(channelID)
	if err != nil {
		return nil, err
	}
	message, err := c.repo.SendMessage(userID, channelID, messageDTO.Text, messageDTO.Files)
	if err != nil {
		return nil, err
	}

	receiverType := "channels"
	if channel.Type == models.ChannelTypePrivateChat {
		receiverType = "users"
	} else if channel.Type == models.ChannelTypeGroupChat {
		receiverType = "groups"
	}

	notifData := map[string]any{
		"message": "You have a new message",
		"link":    fmt.Sprintf("chat/%s/%d", receiverType, userID),
	}

	for _, user := range users {
		if err := c.notifier.Notification(user.ID, "message", notifData); err != nil {
			log.Errorf("error sending notification: %s", err)
		}
	}

	return message, nil
}

func (c Channel) GetMessages(userID, channelID uint, limit int, skip int) ([]models.Message, error) {
	// TODO: check user access
	return c.repo.GetMessages(channelID, limit, skip)
}

// MarkAsRead marks the specified messages as read by the given user.
func (c Channel) MarkAsRead(userID uint, messageIDs ...uint) (int64, error) {
	count, err := c.repo.MarkAsRead(userID, messageIDs...)
	if err != nil {
		return 0, err
	}
	if count > 0 {
		if err := c.notifier.Notification(userID, "message", messageIDs); err != nil {
			log.Errorf("error sending notification: %s", err)
		}
	}
	return count, nil
}

// MarkAllAsRead marks all messages in the specified channel as read by the given user.
func (c Channel) MarkAllAsRead(userID, channelID uint) (int64, error) {
	// todo fix websocket for update read status
	//users, err := c.repo.GetUsersInChannelByID(channelID)
	//if err == nil {
	//	for _, user := range users {
	//		if err := c.notifier.Notification(user.ID, "seen", 1); err != nil {
	//			log.Errorf("error sending notification: %s", err)
	//		}
	//	}
	//}

	return c.repo.MarkAllAsRead(userID, channelID)
}

func (c Channel) UpdateMessage(userID, messageID uint, newText string) error {
	return c.repo.UpdateMessage(userID, messageID, newText)
}

func (c Channel) DeleteMessage(userID, messageID uint) error {
	return c.repo.DeleteMessage(userID, messageID)
}

func (c *Channel) ForwardMessage(userID, targetChannelID, messageID uint) (*models.Message, error) {
	// بگیر پیام اصلی رو
	originalMessage, err := c.repo.GetMessageByID(messageID)
	if err != nil {
		return nil, err
	}

	// پیام جدید بساز روی چت جدید
	newMessage, err := c.repo.SendMessage(userID, targetChannelID, originalMessage.Text, []uint{})
	if err != nil {
		return nil, err
	}

	return newMessage, nil
}

