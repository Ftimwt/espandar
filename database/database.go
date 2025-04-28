package database

import (
	"espandar/models"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func Database() *gorm.DB {
	if db == nil {
		var err error
		db, err = gorm.Open(sqlite.Open("espandar.db"), &gorm.Config{})
		if err != nil {
			log.Fatalf("Failed to connect to database: %v", err)
		}
		log.Println("Database connection established")

		if err := db.AutoMigrate(&models.User{}, &models.Message{}, &models.Channel{}, &models.Group{}, &models.GroupMember{}, &models.File{}, &models.Contact{}, &models.Chat{}); err != nil {
			log.Fatalf("Failed to auto-migrate models: %v", err)
		}
		log.Println("Database migration completed")
	}
	return db
}
