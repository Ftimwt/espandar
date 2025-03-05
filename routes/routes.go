package routes

import (
	"espandar/controllers"
	"espandar/middlewares"
	"espandar/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	r.StaticFile("/", "./assets/index.html")
	r.StaticFile("/style.css", "./assets/style.css")

	authRoute := r.Group("/auth")
	authRoute.POST("login", controllers.Login)
	authRoute.POST("signup", controllers.SignUp)
	authRoute.DELETE("/signout", middlewares.AuthMiddleware(db), controllers.SignOut)

	profileRoute := r.Group("/profile").Use(middlewares.AuthMiddleware(db))
	profileRoute.GET("/", controllers.GetProfile)
	profileRoute.PUT("/update", controllers.UpdateProfile)

	r.GET("/users", middlewares.AuthMiddleware(db), controllers.GetUsers)

	r.POST("/groups", middlewares.AuthMiddleware(db), controllers.CreateGroup)

	r.GET("/socket.io/", gin.WrapF(websocket.SocketHandler))
	r.POST("/socket.io/", gin.WrapF(websocket.SocketHandler))

	messagesRoute := r.Group("/messages").Use(middlewares.AuthMiddleware(db))
	messagesRoute.POST("/:receiver_type/:receiver_id", controllers.SendMessage)
	messagesRoute.GET("/:receiver_type/:receiver_id", controllers.GetMessages)
	messagesRoute.PUT("/:user_id/:message_id", controllers.UpdateMessage)
	messagesRoute.DELETE("/:user_id/:message_id", controllers.DeleteMessage)

	channelsRoute := r.Group("/channels").Use(middlewares.AuthMiddleware(db))
	channelsRoute.POST("/", controllers.CreateChannel)
	channelsRoute.GET("/", controllers.GetChannels)
	channelsRoute.GET("/:id", controllers.GetChannel)
	channelsRoute.DELETE("/:id", controllers.DeleteChannel)
	channelsRoute.DELETE("/:id/members/:user_id", controllers.RemoveMemberFromChannel)
	channelsRoute.POST("/:channel_id/members", controllers.AddMemberToChannel)

	groupsRoute := r.Group("/groups").Use(middlewares.AuthMiddleware(db))
	groupsRoute.POST("/", controllers.CreateGroup)
	groupsRoute.GET("/", controllers.GetGroups)
	groupsRoute.GET("/:id", controllers.GetGroup)
	groupsRoute.DELETE("/:id", controllers.DeleteGroup)
	groupsRoute.DELETE("/:id/members/:user_id", controllers.RemoveMemberFromGroup)
	groupsRoute.POST("/:group_id/members", controllers.AddMemberToGroup)
}
