package providers

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"v/pkg/config"
	"v/pkg/models"
)

func LoadDatabase(cfg *config.Config) (*gorm.DB, error) {
	dsn := cfg.Database.Name + ".sqlite"
	db, err := gorm.Open(sqlite.Open(dsn))
	if err != nil {
		return nil, err
	}
	if err := db.AutoMigrate(
		&models.User{},
		&models.Channel{},
		&models.Message{},
		&models.File{},
		&models.MessageReader{},
		&models.Conference{},
	); err != nil {
		return nil, err
	}
	return db, nil
}
