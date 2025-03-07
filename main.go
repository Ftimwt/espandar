package main

import (
	"espandar/controllers"
	"espandar/database"
	"espandar/routes"
	"espandar/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var db *gorm.DB

func main() {
	db = database.Database()

	r := gin.Default()
	routes.SetupRoutes(r, db)
	controllers.SetDB(db)

	websocket.InitSocketServer()
	websocket.InitSocketServer()

	r.Run(":8080")

}
