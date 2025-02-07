package main

import (
	"Spandar/controllers"
	"Spandar/database"
	"Spandar/routes"
	"Spandar/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var db *gorm.DB

func main() {
	db := database.Database()

	r := gin.Default()
	routes.SetupRoutes(r)
	controllers.SetDB(db)

	websocket.InitSocketServer()

	r.Run(":8080")

}
