package models

import "gorm.io/gorm"

type Channel struct {
	gorm.Model
	Name        string `json:"name"`
	CreatorID   uint   `json:"creator_id"`
	Description string `json:"description"`
	Members     []User `gorm:"many2many:channel_members;"`
}
