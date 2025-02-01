package routes

import (
	"Spandar/controllers"
	"Spandar/middlewares"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	r.POST("/auth/login", controllers.Login)
	r.POST("/auth/signup", controllers.Register)
	r.GET("/profile", middlewares.AuthMiddleware(), controllers.GetProfile)
	r.PUT("/profile/update", middlewares.AuthMiddleware(), controllers.UpdateProfile)
	r.GET("/users", middlewares.AuthMiddleware(), controllers.GetUsers)
	r.DELETE("/auth/signout", middlewares.AuthMiddleware(), controllers.SignOut)
	r.POST("/messages/:user_id", middlewares.AuthMiddleware(), controllers.CreateMessage)
	r.GET("/messages/:user_id", middlewares.AuthMiddleware(), controllers.GetMessage)
	r.PUT("/messages/:user_id/:message_id", middlewares.AuthMiddleware(), controllers.UpdateMessage)
	r.DELETE("/messages/:user_id/:message_id", middlewares.AuthMiddleware(), controllers.DeleteMessage)

	r.GET("/ws", controllers.WebsocketHandler)
}
