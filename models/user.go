package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Id       uint   `json:"id"`
	Username string `gorm:"unique" json:"username"`
	Password string `json:"-"`
}
