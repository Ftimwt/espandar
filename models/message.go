package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	SenderID   uint   `json:"user_id" form:"sender_id" binding:"required"`
	Content    string `json:"content" form:"Content" binding:"omitempty"` // Content اختیاری
	Type       string `json:"type" form:"type" binding:"required"`
	UserID     uint   `json:"receiver_id" form:"receiver_id" binding:"required"`
	GroupID    uint   `json:"group_id" form:"group_id"`
	ChannelID  uint   `json:"channel_id" form:"channel_id"`
	ChatID     uint   `json:"chat_id" form:"chat_id" binding:"required"`
	Seen       bool   `json:"seen" form:"seen"`
	IsReceived bool   `json:"is_received" form:"is_received"`

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
