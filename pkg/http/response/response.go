package response

import (
	"github.com/gofiber/fiber/v2"
)

type Builder struct {
	data   map[string]any
	status int
}

func Response() *Builder {
	return &Builder{}
}

// WithField - add data to response
func (b *Builder) WithField(key string, value any) *Builder {
	b.data[key] = value
	return b
}

// WithMessage - add a message to response
func (b *Builder) WithMessage(message string) *Builder {
	b.data["message"] = message
	return b
}

// WithStatus - add status to response
func (b *Builder) WithStatus(status int) *Builder {
	b.status = status
	return b
}

// Send - send response
func (b *Builder) Send(c *fiber.Ctx) error {
	return c.Status(b.status).JSON(b.data)
}

// SendWithStatus Send - send response
func (b *Builder) SendWithStatus(c *fiber.Ctx, status int) error {
	return c.Status(status).JSON(b.data)
}

func WithStatus(status int) *Builder {
	return &Builder{
		status: status,
		data:   map[string]any{},
	}
}

// WithField - add data to response
func WithField(key string, value any) *Builder {
	return &Builder{
		data:   map[string]any{key: value},
		status: fiber.StatusOK,
	}
}

// WithMessage - add a message to response
func WithMessage(message string) *Builder {
	return &Builder{
		status: fiber.StatusOK,
		data: map[string]any{
			"message": message,
		},
	}
}
