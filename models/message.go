package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	UserID  uint   `json:"user_id"`
	Content string `json:"content"`
	Type    string `json:"type"`
}
