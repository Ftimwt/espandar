package handlers

import (
	"github.com/gofiber/fiber/v2"
	"log"
	"v/internal/dto"
	"v/internal/mapper"
	"v/internal/services"
	"v/pkg/http/response"
)

type Conference struct {
	service *services.Conference
}

func NewConference(service *services.Conference) *Conference {
	return &Conference{service: service}
}

func (h *Conference) Create(ctx *fiber.Ctx) error {
	var body dto.ConferenceCreateRequest
	if err := ctx.BodyParser(&body); err != nil {
		return err
	}

	user := getUser(ctx)
	conference, code, err := h.service.CreateConference(user.ID, body)
	if err != nil {
		return err
	}

	// Optional: Send invitations
	if err := h.service.SendInvitations(conference.ID, body.Participants); err != nil {
		log.Println("Failed to send invitations:", err)
	}

	return response.
		WithField("conference", mapper.ToConference(*conference)).
		WithField("code", code).
		WithMessage("کنفرانس ایجاد شد").
		Send(ctx)
}

func (h *Conference) ListUserConferences(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	confs, err := h.service.GetUserConferences(user.ID)
	if err != nil {
		return err
	}
	return response.WithField("conferences", mapper.ToConferences(confs)).Send(ctx)
}

func (h *Conference) Invite(ctx *fiber.Ctx) error {
	conferenceID, err := ctx.ParamsInt("conferenceID")
	if err != nil {
		return err
	}

	var body struct {
		Participants []uint `json:"participants"`
	}

	if err := ctx.BodyParser(&body); err != nil {
		return err
	}

	if err := h.service.SendInvitations(uint(conferenceID), body.Participants); err != nil {
		return err
	}

	return ctx.SendStatus(fiber.StatusOK)
}

func (h *Conference) GetByID(ctx *fiber.Ctx) error {
	conferenceID, err := ctx.ParamsInt("conferenceID")
	if err != nil {
		return err
	}

	conference, err := h.service.GetByID(uint(conferenceID))
	if err != nil {
		return err
	}

	return response.WithField("conference", conference).Send(ctx)
}
