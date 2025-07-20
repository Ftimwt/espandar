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
	ID       uint        `json:"id" gorm:"primaryKey"`  
	Text     string      `json:"text"`
	Files    []File      `json:"files,omitempty" gorm:"many2many:message_files;"`
	SenderID uint        `json:"-"`
	Sender   User        `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
	Type     MessageType `gorm:"default:text" json:"type"`
	Readers  []User      `json:"readers,omitempty" gorm:"many2many:message_readers;"`
	FileURL  string      `json:"file_url,omitempty"`
	FileType string      `json:"file_type,omitempty"`
}

type MessageReader struct {
	UserID    uint `json:"user_id"`
	MessageID uint `json:"message_id"`
	ReadAt    time.Time
}

type FileType string

const (
	FileTypeImage FileType = "image"
	FileTypeAudio FileType = "audio"
	FileTypeVideo FileType = "video"
	FileTypeText  FileType = "text"
	FileTypeFile  FileType = "file"
)

type File struct {
	ID   uint     `json:"id" gorm:"primaryKey"`
	Name string   `json:"name"`
	Path string   `json:"path"`
	Type FileType `json:"type"`
}
