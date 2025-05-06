package routes

import (
	"espandar/controllers"
	"espandar/jwt"
	"espandar/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(
	r *gin.Engine,
	db *gorm.DB,
	authCtrl *controllers.AuthController,
	messageCtrl *controllers.MessageController,
	channelCtrl *controllers.ChannelController,
	groupCtrl *controllers.GroupController,
	contactCtrl *controllers.ContactController,
	userCtrl *controllers.UserController,
	fileCtrl *controllers.FileController,
) {
	r.Static("/static", "./static")

	r.POST("/signup", authCtrl.SignUp)
	r.POST("/login", authCtrl.Login)
	r.POST("/admin/signup", authCtrl.AdminSignUp)
	r.POST("/admin/login", authCtrl.AdminLogin)

	protected := r.Group("/")
	protected.Use(jwt.JWTAuthMiddleware(db))
	{
		protected.GET("/profile", authCtrl.GetProfile)
		protected.PUT("/profile", authCtrl.UpdateProfile)
		protected.POST("/signout", authCtrl.SignOut)
		protected.GET("/users", userCtrl.GetUsers)
		protected.POST("/message/:receiver_type/:receiver_id", messageCtrl.SendMessage)
		protected.GET("/messages/:receiver_type/:receiver_id", messageCtrl.GetMessages)
		protected.POST("/message/:message_id/seen", messageCtrl.MarkMessageAsSeen)
		protected.PUT("/message/:message_id", messageCtrl.UpdateMessage)
		protected.DELETE("/message/:message_id", messageCtrl.DeleteMessage)
		protected.POST("/channel", channelCtrl.CreateChannel)
		protected.POST("/channels/with-members", channelCtrl.CreateChannelWithMembers)
		protected.POST("/channel/:channel_id/user/:user_id", channelCtrl.AddChannelMember)
		protected.DELETE("/channel/:channel_id/user/:user_id", channelCtrl.RemoveMemberFromChannel)
		protected.POST("/channel/:channel_id/leave", channelCtrl.LeaveChannel)
		protected.GET("/channels", channelCtrl.GetChannels)
		protected.GET("/channel/:id", channelCtrl.GetChannel)
		protected.DELETE("/channel/:channel_id", channelCtrl.DeleteChannel)
		protected.POST("/group", groupCtrl.CreateGroup)
		protected.POST("/groups/with-members", groupCtrl.CreateGroupWithMembers)
		protected.POST("/group/:group_id/user/:user_id", groupCtrl.AddGroupMember)
		protected.DELETE("/group/:group_id/user/:user_id", groupCtrl.RemoveMemberFromGroup)
		protected.POST("/group/:group_id/leave", groupCtrl.LeaveGroup)
		protected.GET("/groups", groupCtrl.GetGroups)
		protected.GET("/group/:id", groupCtrl.GetGroup)
		protected.DELETE("/group/:group_id", groupCtrl.DeleteGroup)
		protected.GET("/contacts", contactCtrl.GetContacts)
		protected.GET("./files", fileCtrl.GetFiles)
		protected.GET("/workflows", messageCtrl.GetWorkflows)
		protected.GET("/ws", websocket.SocketHandler)
	}

	adminProtected := r.Group("/admin")
	adminProtected.Use(jwt.JWTAuthMiddleware(db))
	{
		adminProtected.GET("/user/:id", authCtrl.GetUserByID)
		adminProtected.PUT("/user/:id", authCtrl.UpdateUser)
		adminProtected.DELETE("/user/:id", authCtrl.DeleteUser)
		adminProtected.POST("/users", authCtrl.AddUser)
		adminProtected.POST("/contacts", contactCtrl.AddContact)
	}
}
