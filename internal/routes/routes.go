package routes

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"v/internal/repositories"
	"v/internal/services"
	"v/pkg/providers"
)

type Option struct {
	userRepo          *repositories.User
	userService       *services.User
	channelRepo       *repositories.Channel
	groupRepo         *repositories.Group
	channelService    *services.Channel
	chatRepo          repositories.ChatI
	chatService       services.ChatI
	jwt               *providers.Jwt
	db                *gorm.DB
	notifier          *providers.Notifier
	groupService      *services.Group
	conferenceRepo    *repositories.Conference // ✅ اضافه کن
	conferenceService *services.Conference     // ✅ اضافه کن
}

func SetupRoutes(routes fiber.Router, db *gorm.DB, jwt *providers.Jwt, notifier *providers.Notifier, callback map[string]func(routes fiber.Router, option Option)) {
	userRepo := repositories.NewUser(db)
	channelRepo := repositories.NewChannel(db)
	chatRepo := repositories.NewChat(db)
	groupRepo := repositories.NewGroup(db)
	conferenceRepo := repositories.NewConference(db) // ✅ ساخت ریپو کنفرانس

	channelService := services.NewChannel(channelRepo, notifier)
	groupService := services.NewGroup(channelService, groupRepo, channelRepo, userRepo)
	userService := services.NewUser(userRepo, jwt, notifier, channelService)
	frontendURL := "http://localhost:5173"

	conferenceService := services.NewConference(
		conferenceRepo,
		notifier,
		userRepo,
		userService,
		frontendURL,
	)

	option := Option{
		userRepo:          userRepo,
		userService:       userService,
		channelRepo:       channelRepo,
		groupRepo:         groupRepo,
		channelService:    channelService,
		groupService:      groupService,
		chatRepo:          chatRepo,
		chatService:       services.NewChat(chatRepo),
		conferenceRepo:    conferenceRepo,    // ✅
		conferenceService: conferenceService, // ✅
		jwt:               jwt,
		db:                db,
		notifier:          notifier,
	}

	for prefix, fn := range callback {
		fn(routes.Group(prefix), option)
	}
}
