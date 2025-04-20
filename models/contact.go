package models

import (
	"gorm.io/gorm"
)

type Contact struct {
	gorm.Model
	UserID uint   `json:"user_id"`                                // شناسه کاربر
	Name   string `json:"name" binding:"required"`                // نام کانتکت
	Phone  string `json:"phone" binding:"required" gorm:"unique"` // شماره کانتکت
}
