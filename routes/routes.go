package routes

import (
	"Spandar/controllers"
	"Spandar/middlewares"
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

	messagesRoute := r.Group("/messages").Use(middlewares.AuthMiddleware())
	messagesRoute.POST("/:user_id", controllers.CreateMessage)
	messagesRoute.GET("/:user_id", controllers.GetMessages)
	messagesRoute.PUT("/:user_id/:message_id", controllers.UpdateMessage)
	messagesRoute.DELETE("/:user_id/:message_id", controllers.DeleteMessage)

	r.GET("/ws", controllers.WebsocketHandler)
}
