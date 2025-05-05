package models

import "gorm.io/gorm"

type FileType string

const (
	Voice   FileType = "voice"
	Picture FileType = "picture"
	Video   FileType = "video"
	Default FileType = "default"
)

type File struct {
	gorm.Model
	FilePath  string   `gorm:"type:varchar(255)" json:"file_path"`
	Type      FileType `gorm:"type:varchar(20)" json:"type"`
	MessageID uint     `gorm:"index" json:"message_id"`
}
