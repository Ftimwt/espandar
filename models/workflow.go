package models

import "gorm.io/gorm"

type Workflow struct {
	gorm.Model
	Title     string `json:"title"`
	CreatorID uint   `json:"creator_id"`
}
