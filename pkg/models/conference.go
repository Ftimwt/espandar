package models

import (
	"gorm.io/gorm"
	"time"
)

type Conference struct {
	gorm.Model
	Title        string
	CreatorID    uint
	ScheduledAt  *time.Time
	Participants []User `gorm:"many2many:conference_users"`
	Code         string
}
