package models

import "gorm.io/gorm"

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
}

type File struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`
	Path string `json:"path"`
}
