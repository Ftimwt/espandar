package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	ID uint `gorm:"primaryKey" json:"id"`

	Username string `gorm:"unique" json:"username"`
	Password string `json:"-"`
}
//FirstName string `json:"first_name"`
//	LastName  string `json:"last_name"`