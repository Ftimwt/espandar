package models

import "gorm.io/gorm"

type User struct {
	gorm.Model

	Username  string `gorm:"unique" json:"username"`
	Password  string `json:"-"`
	Email     string `json:"email" gorm:"unique"`
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
}
