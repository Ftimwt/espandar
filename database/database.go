package database

import (
	"espandar/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func Database() *gorm.DB {
	if db == nil {
		var err error
		db, err = gorm.Open(sqlite.Open("espandar.db"), &gorm.Config{})
		if err != nil {
			panic(err)
		}
	}

	db.AutoMigrate(&models.User{}, &models.Message{}, &models.Channel{}, &models.Group{}, &models.File{}, &models.Contact{})
	return db
}
