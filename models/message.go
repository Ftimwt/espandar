package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	UserID     uint   `json:"user_id"`
	GroupID    uint   `json:"group_id,omitempty"`
	SenderID   uint   `json:"sender_id"`
	ReceiverID uint   `json:"reciver_id"`
	Content    string `json:"content"`
	Type       string `json:"type"`
	IsPrivate  bool   `json:"is_private"`
}
