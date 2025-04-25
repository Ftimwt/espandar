package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	SenderID   uint   `json:"user_id"`
	Content    string `json:"content"`
	Type       string `json:"type"`
	UserID     uint   `json:"receiver_id"`
	GroupID    uint
	ChannelID  uint
	ChatID     uint `json:"chat_id"`
	Seen       bool `json:"seen"`
	IsReceived bool `json:"is_received"`

	User    User
	Group   Group
	Channel Channel
	Files   []File
}

type Chat struct {
	gorm.Model
	UserID1  uint      `json:"user_id1" gorm:"column:user_id1"`
	UserID2  uint      `json:"user_id2" gorm:"column:user_id2"`
	Messages []Message `gorm:"foreignkey:ChatID"`
}
