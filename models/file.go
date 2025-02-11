package models

import "gorm.io/gorm"

type FileType string

const (
	Voice   FileType = "voice"
	Picture FileType = "picture"
	Default FileType = "default"
)

type File struct {
	gorm.Model
	FilePath  string `gorm:"unique"`
	Type      FileType
	MessageID uint
}
