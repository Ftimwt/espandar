package dto

type Message struct {
	Content string `json:"content" form:"content" binding:"required"`
}
