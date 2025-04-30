package models

import "gorm.io/gorm"

type Channel struct {
	gorm.Model
	Name        string `json:"name" gorm:"not null"`
	CreatorID   uint   `json:"creator_id" gorm:"not null"`
	Description string `json:"description"`
	Members     []User `gorm:"many2many:channel_members;"`
}

type GhannelMember struct {
	gorm.Model
	GhannelID uint `json:"channel_id" gorm:"primarykey"`
	UserID    uint `json:"user_id" gorm:"primarykey"`
}
