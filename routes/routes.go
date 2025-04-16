package routes

import (
	"espandar/controllers"
	"espandar/jwt"
	"espandar/websocket"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SetupRoutes تنظیم مسیرهای برنامه
func SetupRoutes(
	r *gin.Engine,
	authCtrl *controllers.AuthController,
	messageCtrl *controllers.MessageController,
	channelCtrl *controllers.ChannelController,
	groupCtrl *controllers.GroupController,
	contactController *controllers.ContactController,
) {
	r.Static("/static", "./static")

	// مسیرهای بدون نیاز به احراز هویت
	r.POST("/signup", authCtrl.SignUp)
	r.POST("/login", authCtrl.Login)

	// گروه مسیرهای احراز هویت‌شده
	protected := r.Group("/")
	protected.Use(jwt.JWTAuthMiddleware())
	{

		// پروفایل کاربر
		protected.GET("/profile", authCtrl.GetProfile)
		protected.PUT("/profile", authCtrl.UpdateProfile)
		protected.GET("/users", authCtrl.GetUsers)
		protected.POST("/signout", authCtrl.SignOut)

		// پیام‌ها
		protected.POST("/message/:receiver_type/:receiver_id", messageCtrl.SendMessage)
		protected.GET("/messages/:receiver_type/:receiver_id", messageCtrl.GetMessages)
		protected.PUT("/message/:message_id", messageCtrl.UpdateMessage)
		protected.DELETE("/message/:message_id", messageCtrl.DeleteMessage)

		// کانال‌ها
		protected.POST("/channel", channelCtrl.CreateChannel)
		protected.POST("/channel/:channel_id/user/:user_id", channelCtrl.AddMemberToChannel)
		protected.DELETE("/channel/:channel_id/user/:user_id", channelCtrl.RemoveMemberFromChannel)
		protected.GET("/channels", channelCtrl.GetChannels)
		protected.GET("/channel/:id", channelCtrl.GetChannel)
		protected.DELETE("/channel/:channel_id", channelCtrl.DeleteChannel)

		// گروه‌ها
		protected.POST("/group", groupCtrl.CreateGroup)
		protected.POST("/group/:group_id/user/:user_id", groupCtrl.AddMemberToGroup)
		protected.DELETE("/group/:group_id/user/:user_id", groupCtrl.RemoveMemberFromGroup)
		protected.GET("/groups", groupCtrl.GetGroups)
		protected.GET("/group/:id", groupCtrl.GetGroup)
		protected.DELETE("/group/:group_id", groupCtrl.DeleteGroup)
	}

	// مسیر WebSocket
	r.GET("/socket.io/*any", gin.WrapH(http.HandlerFunc(websocket.SocketHandler)))
	r.POST("/socket.io/*any", gin.WrapH(http.HandlerFunc(websocket.SocketHandler)))
}
