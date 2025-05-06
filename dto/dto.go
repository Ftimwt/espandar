package dto

import "time"

type Message struct {
	Content string `json:"content" form:"Content" binding:"omitempty"` // Content اختیاری و مطابق با کلاینت
	Type    string `json:"type" form:"type" binding:"required"`        // type اجباری
}

type group struct {
	Name string `json:"name" form:"name" binding:"required"`
}

type ChannelRequest struct {
	Name        string `json:"name" form:"name" binding:"required"`
	Description string `json:"description" form:"description"` // بدون binding:"required"
	Members     []uint `json:"members" form:"members"`
}

type ChannelModel struct {
	ID          uint        `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Members     []UserModel `json:"members"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type ChannelResponse struct {
	Message string       `json:"message"`
	Channel ChannelModel `json:"channel"`
}
