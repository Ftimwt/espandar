package main

import (
	"espandar/controllers"
	"espandar/database"
	"espandar/routes"
	"espandar/websocket"

	"github.com/gin-gonic/gin"
)

func main() {
	db := database.Database()

	r := gin.Default()

	// ایجاد Broadcaster
	broadcaster := &websocket.SocketBroadcaster{}

	// ایجاد Controllerها
	authController := controllers.NewAuthController(db)
	messageController := controllers.NewMessageController(db, broadcaster)
	channelController := controllers.NewChannelController(db)
	groupController := controllers.NewGroupController(db)

	// تنظیم روت‌ها
	routes.SetupRoutes(r, authController, messageController, channelController, groupController)

	websocket.InitSocketServer()

	r.Run(":8080")
}
