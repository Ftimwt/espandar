package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"v/internal/repositories"
	"v/internal/services"
	"v/pkg/providers"
)

type Option struct {
	userRepo       *repositories.User
	userService    *services.User
	channelRepo    *repositories.Channel
	groupRepo      *repositories.Group
	channelService *services.Channel
	chatRepo       repositories.ChatI
	chatService    services.ChatI
	jwt            *providers.Jwt
	db             *gorm.DB
	notifier       *providers.Notifier
	groupService   *services.Group
}

func SetupRoutes(routes fiber.Router, db *gorm.DB, jwt *providers.Jwt, notifier *providers.Notifier, callback map[string]func(routes fiber.Router, option Option)) {
	userRepo := repositories.NewUser(db)
	channelRepo := repositories.NewChannel(db)
	chatRepo := repositories.NewChat(db)
	groupRepo := repositories.NewGroup(db)
	channelService := services.NewChannel(channelRepo, notifier)
	groupSerivce := services.NewGroup(channelService, groupRepo, channelRepo, userRepo)
	option := Option{
		userRepo:       userRepo,
		userService:    services.NewUser(userRepo, jwt, notifier, channelService),
		channelRepo:    channelRepo,
		groupRepo:      groupRepo,
		channelService: channelService,
		groupService:   groupSerivce,
		chatRepo:       chatRepo,
		chatService:    services.NewChat(chatRepo),
		jwt:            jwt,
		db:             db,
		notifier:       notifier,
	}

	for prefix, fn := range callback {
		fn(routes.Group(prefix), option)
	}
}
