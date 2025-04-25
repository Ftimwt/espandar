package main

import (
	"espandar/controllers"
	"espandar/database"
	"espandar/jwt"
	"espandar/routes"
	"espandar/websocket"
	"fmt"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("Error loading .env file")
	}

	db := database.Database()
	if db == nil {
		panic("Failed to connect to database")
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * 60 * 60,
	}))

	jwt.InitJWT()

	broadcaster := &websocket.SocketBroadcaster{}

	authController := controllers.NewAuthController(db)
	messageController := controllers.NewMessageController(db, broadcaster)
	channelController := controllers.NewChannelController(db)
	groupController := controllers.NewGroupController(db)
	contactController := controllers.NewContactController(db)

	routes.SetupRoutes(r, db, authController, messageController, channelController, groupController, contactController)

	// مسیر WebSocket
	r.GET("/ws", func(c *gin.Context) {
		websocket.SocketHandler(c.Writer, c.Request)
	})

	log.Fatal(r.Run(":8080"))
}
