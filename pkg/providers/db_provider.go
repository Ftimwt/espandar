package providers

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"v/pkg/config"
)

func LoadDatabase(cfg *config.Config) (*gorm.DB, error) {
	return gorm.Open(sqlite.Open("database.sqlite"))
}
