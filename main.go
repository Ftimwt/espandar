package main

import (
	"espandar/controllers"
	"espandar/database"
	"espandar/routes"
	"espandar/websocket"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	db := database.Database()

	r := gin.Default()

	// تنظیم CORS
	r.Use(cors.New(cors.Config{
		AllowAllOrigins: true, // اجازه دسترسی به همه دامنه‌ها
		// یا می‌توانید دامنه‌های خاصی را مشخص کنید:
		// AllowOrigins: []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

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
