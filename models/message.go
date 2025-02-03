package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	UserID  uint   `json:"user_id"`
	GroupID uint   `json:"group_id,omitempty"`
	Content string `json:"content"`
	Type    string `json:"type"`
}
