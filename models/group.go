package models

import "gorm.io/gorm"

type Group struct {
	gorm.Model
	Name      string    `json:"name" gorm:"not null"`
	CreatorID uint      `json:"creator_id" gorm:"not null"`
	Members   []User    `gorm:"many2many:group_members;"`
	Messages  []Message `gorm:"foreignkey:GroupID"`
}

type GroupMember struct {
	gorm.Model
	GroupID uint `json:"group_id" gorm:"primarykey"`
	UserID  uint `json:"user_id" gorm:"primarykey"`
}
