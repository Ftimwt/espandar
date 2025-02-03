package models

import "gorm.io/gorm"

type Group struct {
	gorm.Model
	Name     string    `json:"name"`
	Members  []User    `gorm:"manytomany:group_members;"`
	Messages []Message `gorm:"foreignkey:GroupID"`
}
