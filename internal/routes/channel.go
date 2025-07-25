package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
	"v/internal/repositories"
	"v/internal/services"
)

func SetupChannel(routes fiber.Router, option Option) {
	userRepo := repositories.NewUser(option.db)
	userService := services.NewUser(userRepo, option.jwt, option.notifier, nil)

	handler := handlers.NewChannel(option.channelService)

	protected := routes.Use(middlewares.IsAuthenticated(userService, option.jwt))

	// مسیرهای عمومی برای همه اعضا (چت خصوصی + گروه + کانال)
	protected.Post("/", handler.Create)
	protected.Get("/", handler.List)
	protected.Get("/:channelID", handler.GetByID)
	protected.Get("/:channelID/messages", handler.GetMessages)
	protected.Put("/:channelID/messages/read", handler.MarkAllAsRead)
	protected.Put("/:channelID/messages/:messageID/read", handler.MarkAsRead)

	protected.Post("/:channelID/send", handler.SendMessage)
	protected.Put("/:channelID/messages/:messageID", handler.UpdateMessage)
	protected.Delete("/:channelID/messages/:messageID", handler.DeleteMessage)
	protected.Post("/:channelID/messages/:messageID/forward", handler.ForwardMessage)

	// مسیرهای مدیریتی فقط برای سازنده کانال (در صورت نیاز به توسعه)
	_ = protected.Group("/:channelID/admin").Use(middlewares.IsChannelManager(option.channelService))
}
