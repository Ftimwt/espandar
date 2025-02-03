package models

import "gorm.io/gorm"

type Channel struct {
	gorm.Model
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `json:"name"`
	CreatorID   uint   `json:"creator_id"`
	Description string `json:"description"`
}
