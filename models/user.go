package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Username     string `gorm:"unique;not null" json:"username"`
	Password     string `json:"-"`
	Phone        string `json:"phone" gorm:"unique;not null;type:varchar(11)"`
	Role         string `json:"role" gorm:"default:'user'"`
	ProfileImage string `json:"profile_image" gorm:"default:'/Uploads/profile/default.png'"`
	IsOnline     bool   `json:"is_online" gorm:"default:false"`
}
