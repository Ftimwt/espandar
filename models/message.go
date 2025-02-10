package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	SenderID  uint   `json:"user_id"`
	Content   string `json:"content"`
	Type      string `json:"type"`
	UserID    uint
	GroupID   uint
	ChannelID uint

	User    User
	Group   Group
	Channel Channel
	Files   []File
}
