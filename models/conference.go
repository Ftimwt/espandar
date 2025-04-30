package models

import (
	"time"

	"gorm.io/gorm"
)

// Conference represents a multi-user conference
type Conference struct {
	gorm.Model
	Title      string    `json:"title"`
	StartTime  time.Time `json:"start_time"`
	CreatorID  uint      `json:"creator_id"`
	Members    []User    `gorm:"many2many:conference_members"`
	InviteLink string    `json:"invite_link"`
	RoomID     string    `json:"room_id"` // For WebRTC room
}

// ConferenceMember represents the many-to-many relationship between Conference and User
type ConferenceMember struct {
	ConferenceID uint `json:"conference_id" gorm:"primaryKey"`
	UserID       uint `json:"user_id" gorm:"primaryKey"`
}
