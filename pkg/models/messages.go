package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	Text     string `json:"text"`
	Files    []File `json:"files,omitempty" gorm:"many2many:message_files;"`
	SenderID uint   `json:"-"`
	Sender   User   `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
}

type File struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`
	Path string `json:"path"`
}
