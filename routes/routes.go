package routes

import (
	"Spandar/controllers"
	"Spandar/middlewares"
	"Spandar/websocket"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	authRoute := r.Group("/auth")
	authRoute.GET("login", controllers.Login)
	authRoute.POST("signup", controllers.Register)
	authRoute.DELETE("/signout", middlewares.AuthMiddleware(), controllers.SignOut)

	profileRoute := r.Group("/profile").Use(middlewares.AuthMiddleware())
	profileRoute.GET("/", controllers.GetProfile)
	profileRoute.PUT("/update", controllers.UpdateProfile)

	r.GET("/users", middlewares.AuthMiddleware(), controllers.GetUsers)

	r.POST("/groups", middlewares.AuthMiddleware(), controllers.CreateGroup)
	r.POST("/groups/:group_id/media", controllers.SendMediaMessage)

	r.GET("/socket.io", gin.WrapH(Server))
    r.POST("/socket.io", gin.WrapH(Server))
	
	messagesRoute := r.Group("/messages").Use(middlewares.AuthMiddleware())
	messagesRoute.POST("/user_id/media", controllers.SendMessage)
	messagesRoute.POST("/:user_id", controllers.CreateMessage)
	messagesRoute.POST("/:user_id", controllers.GetMessages)
	messagesRoute.GET("/:group_id", controllers.GetMessages)
	messagesRoute.PUT("/:user_id/:message_id", controllers.UpdateMessage)
	messagesRoute.DELETE("/:user_id/:message_id", controllers.DeleteMessage)

	channelsRoute := r.Group("/channels").Use(middlewares.AuthMiddleware())
	channelsRoute.POST("/", controllers.CreateChannel)

}
