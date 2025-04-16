// models/contact.go
package models

import (
	"gorm.io/gorm"
)

type Contact struct {
	gorm.Model
	UserID uint   `json:"user_id"` // شناسه کاربر
	Name   string `json:"name"`    // نام کانتکت
	Phone  string `json:"phone"`   // شماره کانتکت
}