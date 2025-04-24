package models

import (
	"time"

	"gorm.io/gorm"
)

type Contact struct {
	gorm.Model
	ID        uint       `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"deleted_at"`
	UserID    uint       `json:"user_id"`                                       // شناسه کاربر
	Name      string     `json:"name" binding:"required"`                       // نام کانتکت
	Phone     string     `json:"phone" gorm:"unique;type:varchar(11);not null"` // شماره کانتکت
}
