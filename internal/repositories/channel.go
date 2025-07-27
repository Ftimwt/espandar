package repositories

import (
	"gorm.io/gorm"
	"time"
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
	members := make([]models.User, len(membersID)+1)

	// اضافه کردن سازنده به عنوان عضو
	members[0] = models.User{ID: userID}
	for i, id := range membersID {
		members[i+1] = models.User{ID: id}
	}

	// تشخیص نوع چت بر اساس تعداد اعضا
	channelType := models.ChannelTypeChannel // پیش‌فرض کانال
	if len(membersID) == 1 {
		channelType = models.ChannelTypePrivateChat
	} else if len(membersID) > 1 {
		channelType = models.ChannelTypeGroupChat
	}

	channel := models.Channel{
		Name:            name,
		CreatorID:       userID,
		Members:         members,
		Type:            channelType,
		LastMessageTime: time.Now(),
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
		Preload("Members", "id != ?", userID).
		Find(&channels).Error

	if err != nil {
		return nil, err
	}

	return channels, nil
}

// SendMessage sends message
func (c Channel) SendMessage(senderID, channelID uint, message string, filesID []uint) (*models.Message, error) {
	channel := &models.Channel{
		ID: channelID,
	}

	files := make([]models.File, len(filesID))
	for i, id := range filesID {
		files[i] = models.File{
			ID: id,
		}
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

	if err != nil {
		return nil, err
	}

	err = c.db.
		Model(msg).
		Association("Files").
		Append(files)
	if err != nil {
		return nil, err
	}

	err = c.db.
		Model(&models.Channel{}).
		Where("id=?", channel.ID).
		Update("last_message_time", time.Now()).
		Error
	if err != nil {
		return nil, err
	}

	return msg, nil
}

func (c Channel) SendAlert(channelID uint, message string) (*models.Message, error) {
	db := c.db.Begin()
	defer func() {
		db.Commit()
	}()
	channel := &models.Channel{
		ID: channelID,
	}

	msg := &models.Message{
		Text: message,
		Type: models.AlertMessageType,
	}

	err := c.db.
		Model(&channel).
		Association("Messages").
		Append(msg)

	if err != nil {
		db.Rollback()
		return nil, err
	}

	err = c.db.Update("last_message_time", time.Now()).Error
	if err != nil {
		db.Rollback()
		return nil, err
	}

	return msg, err
}

// GetMessages returns messages
func (c Channel) GetMessages(channelID uint, limit, skip int) ([]models.Message, error) {
	var messages []models.Message
	err := c.db.
		Joins("JOIN channel_chat_messages ccm ON ccm.message_id = messages.id").
		Where("ccm.channel_id = ?", channelID).
		Order("messages.id DESC").
		Preload("Sender").
		Preload("Readers").
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

func (c Channel) Get(id uint) (*models.Channel, error) {
	var model models.Channel
	return &model, c.db.Preload("Members").First(&model, id).Error
}

func (c Channel) MarkAsRead(userID uint, messages ...uint) (int64, error) {
	var count int64
	for _, m := range messages {
		model := models.MessageReader{ReadAt: time.Now()}
		tx := c.db.Model(&models.MessageReader{}).Where("message_id = ? and user_id = ?", m, userID).FirstOrCreate(&model, &models.MessageReader{
			UserID:    userID,
			MessageID: m,
		})
		if err := tx.Error; err != nil {
			return 0, err
		}
		count += tx.RowsAffected
	}
	return count, nil
}

// MarkAllAsRead marks all messages in the specified channel as read by the given user.
// It retrieves all message IDs in the channel and calls MarkAsRead for each message.
// Returns an error if there is an issue retrieving messages or marking them as read.
func (c Channel) MarkAllAsRead(userID uint, channelID uint) (int64, error) {
	var messages []uint
	err := c.db.
		Model(&models.Message{}).
		Select("messages.id").
		Joins("JOIN channel_chat_messages ccm ON ccm.message_id = messages.id").
		Where("ccm.channel_id = ?", channelID).
		Where("messages.sender_id != ?", userID).
		Find(&messages).Error
	if err != nil {
		return 0, err
	}
	return c.MarkAsRead(userID, messages...)
}

// UpdateMessage updates the text of a message by its ID
func (c Channel) UpdateMessage(userID, messageID uint, newText string) error {
	return c.db.Model(&models.Message{}).
		Where("id = ? AND sender_id = ?", messageID, userID).
		Updates(map[string]any{
			"text":      newText,
			"is_edited": true,
		}).Error
}

// DeleteMessage deletes a message by its ID if the user is the sender
func (c Channel) DeleteMessage(userID, messageID uint) error {
	return c.db.Where("id = ? AND sender_id = ?", messageID, userID).Delete(&models.Message{}).Error
}

// ForwardMessage creates a copy of a message and sends it to target channel
func (c Channel) ForwardMessage(senderID, targetChannelID, originalMessageID uint) (*models.Message, error) {
	var original models.Message
	if err := c.db.Preload("Files").First(&original, originalMessageID).Error; err != nil {
		return nil, err
	}

	return c.SendMessage(senderID, targetChannelID, original.Text, extractFileIDs(original.Files))
}

func extractFileIDs(files []models.File) []uint {
	var ids []uint
	for _, f := range files {
		ids = append(ids, f.ID)
	}
	return ids
}

func (c Channel) GetMessageByID(messageID uint) (*models.Message, error) {
	var message models.Message
	if err := c.db.Preload("Files").First(&message, messageID).Error; err != nil {
		return nil, err
	}
	return &message, nil
}
