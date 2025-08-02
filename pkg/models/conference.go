package models

import (
	"gorm.io/gorm"
	"time"
)

type Conference struct {
	gorm.Model
	Title        string     `json:"title"`
	CreatorID    uint       `json:"-"`
	ScheduledAt  *time.Time `json:"scheduled_at"`
	Participants []User     `gorm:"many2many:conference_users"`
	Code         string     `json:"code"`
}
