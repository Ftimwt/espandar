package models

import "gorm.io/gorm"

type Group struct {
	gorm.Model
	Name     string    `json:"name"`
	Members  []User    `gorm:"many2many:group_members;"`
	Messages []Message `gorm:"foreignkey:GroupID"`
}
