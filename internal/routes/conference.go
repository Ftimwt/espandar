package routes

import (
	"github.com/gofiber/fiber/v2"
	"v/internal/handlers"
	"v/internal/middlewares"
)

func SetupConference(router fiber.Router, option Option) {
	handler := handlers.NewConference(option.conferenceService)

	protected := router.Use(middlewares.IsAuthenticated(option.userService, option.jwt))

	protected.Post("/", handler.Create)                     // ایجاد کنفرانس
	protected.Get("/", handler.ListUserConferences)         // لیست کنفرانس‌های کاربر
	protected.Post("/:conferenceID/invite", handler.Invite) // ارسال دعوت‌نامه
	protected.Get("/:conferenceID", handler.GetByID)        // دریافت اطلاعات کنفرانس
}
