package models

import (
	"encoding/json"

	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	SenderID   uint   `json:"user_id" form:"sender_id" binding:"required"`
	Content    string `json:"content" form:"Content" binding:"omitempty"` // Content اختیاری
	Type       string `json:"type" form:"type" binding:"required"`
	UserID     *uint  `json:"receiver_id" form:"receiver_id" binding:"required"`
	GroupID    *uint  `json:"group_id" form:"group_id"`
	ChannelID  *uint  `json:"channel_id" form:"channel_id"`
	ChatID     uint   `json:"chat_id" form:"chat_id" binding:"required"`
	Seen       bool   `json:"seen" form:"seen"`
	IsReceived bool   `json:"is_received" form:"is_received"`

	User    User
	Group   Group
	Channel Channel
	Tags    string  `json:"tags"`
	Files   []File  `gorm:"foreignKey:MessageID"`
	RoomID  *string `json:"room_id"`
}

type Tag struct {
	Type string `json:"type"` // user
	ID   uint   `json:"id"`   // contact_id
	Name string `json:"name"` // contact name
}

type Chat struct {
	gorm.Model
	UserID1  uint      `json:"user_id1" gorm:"column:user_id1"`
	UserID2  uint      `json:"user_id2" gorm:"column:user_id2"`
	Messages []Message `gorm:"foreignkey:ChatID"`
}

func (m *Message) GetTags() ([]Tag, error) {
	var tags []Tag
	if m.Tags == "" {
		return tags, nil
	}
	err := json.Unmarshal([]byte(m.Tags), &tags)
	return tags, err
}

func (m *Message) SetTags(tags []Tag) error {
	data, err := json.Marshal(tags)
	if err != nil {
		return err
	}
	m.Tags = string(data)
	return nil
}
