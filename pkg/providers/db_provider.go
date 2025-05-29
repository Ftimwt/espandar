package providers

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"v/pkg/config"
	"v/pkg/models"
)

func LoadDatabase(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(sqlite.Open("database.sqlite"))
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(&models.User{}); err != nil {
		return nil, err
	}
	return db, nil
}
