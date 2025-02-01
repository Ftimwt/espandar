package main

import (
	"Spandar/controllers"
	"Spandar/routes"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB

func main() {
	var err error
	db, err = gorm.Open(sqlite.Open("Spandar.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&models.User{}, &models.Message{})

	r := gin.Default()
	controllers.SetDB(db)
	routes.SetupRoutes(r)

	go controllers.HandleMessages()

	r.Run(":8080")
}
