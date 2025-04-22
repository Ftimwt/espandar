package main

import (
	"espandar/controllers"
	"espandar/database"
	"espandar/jwt"
	"espandar/routes"
	"espandar/websocket"
	"fmt"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// لود فایل .env
	if err := godotenv.Load(); err != nil {
		fmt.Println("Error loading .env file")
	}

	db := database.Database()
	if db == nil {
		panic("Failed to connect to database")
	}

	r := gin.Default()

	// تنظیم CORS
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// مقداردهی JWT
	jwt.InitJWT()

	// ایجاد Broadcaster
	broadcaster := &websocket.SocketBroadcaster{}

	// ایجاد Controllerها
	authController := controllers.NewAuthController(db)
	messageController := controllers.NewMessageController(db, broadcaster)
	channelController := controllers.NewChannelController(db)
	groupController := controllers.NewGroupController(db)
	contactController := controllers.NewContactController(db)

	// تنظیم روت‌ها
	routes.SetupRoutes(r, db, authController, messageController, channelController, groupController, contactController)

	websocket.InitSocketServer()

	r.Run(":8080")
}
