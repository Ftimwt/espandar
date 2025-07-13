package handlers

import (
	"github.com/gofiber/fiber/v2"
	"net/http"
	"v/internal/dto"
	"v/internal/services"
	"v/pkg/http/response"
)

type Group struct {
	service *services.Group
}

func NewGroup(service *services.Group) *Group {
	return &Group{
		service: service,
	}
}

func (g *Group) CreateGroup(c *fiber.Ctx) error {
	var groupBody dto.CreateGroup
	if err := c.BodyParser(&groupBody); err != nil {
		return err
	}

	group, err := g.service.CreateGroup(getUser(c).ID, groupBody.Name, groupBody.Description, groupBody.Members)
	if err != nil {
		return err
	}

	return c.Status(http.StatusOK).JSON(map[string]any{
		"status":  true,
		"message": "group created",
		"group":   group,
	})
}

func (g *Group) Messages(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("groupID")
	if err != nil {
		return err
	}
	limit := ctx.QueryInt("limit", 10)
	skip := ctx.QueryInt("skip", 0)
	messages, err := g.service.GetMessages(user.ID, uint(channelID), limit, skip)
	if err != nil {
		return err
	}
	return response.
		WithStatus(http.StatusOK).
		WithField("messages", messages).
		Send(ctx)
}

func (g *Group) GroupByID(ctx *fiber.Ctx) error {
	groupID, err := ctx.ParamsInt("groupID")
	if err != nil {
		return err
	}
	group, err := g.service.FindGroupByID(getUser(ctx).ID, uint(groupID))
	return response.
		WithStatus(http.StatusOK).
		WithField("group", group).
		Send(ctx)
}

func (g *Group) Send(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("groupID")
	if err != nil {
		return err
	}
	var body dto.Message
	if err := ctx.BodyParser(&body); err != nil {
		return err
	}
	_, err = g.service.SendMessage(user.ID, uint(channelID), body.Text, nil)
	if err != nil {
		return err
	}
	return response.
		WithStatus(http.StatusOK).
		WithField("message", "message sent").
		Send(ctx)
}

func (g *Group) MarkAsRead(ctx *fiber.Ctx) error {
	user := getUser(ctx)
	channelID, err := ctx.ParamsInt("groupID")
	if err != nil {
		return err
	}
	messageID, err := ctx.ParamsInt("messageID")
	if err != nil {
		return err
	}
	_, err = g.service.MarkAsRead(user.ID, uint(channelID), uint(messageID))
	if err != nil {
		return err
	}
	return response.WithStatus(http.StatusOK).Send(ctx)
}
