package models

import (
	"gorm.io/gorm"
	"time"
)

type MessageType string

const (
	TextMessageType  MessageType = "text"
	AlertMessageType MessageType = "alert"
)

type Message struct {
	gorm.Model
	Text     string      `json:"text"`
	Files    []File      `json:"files,omitempty" gorm:"many2many:message_files;"`
	SenderID uint        `json:"-"`
	Sender   User        `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
	Type     MessageType `gorm:"default:text" json:"type"`
	Readers  []User      `json:"readers,omitempty" gorm:"many2many:message_readers;"`
}

type MessageReader struct {
	UserID    uint `json:"user_id"`
	MessageID uint `json:"message_id"`
	ReadAt    time.Time
}

type File struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`
	Path string `json:"path"`
}
