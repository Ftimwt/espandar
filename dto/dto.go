package dto

type Message struct {
	Content string `json:"content" form:"content" binding:"required"`
}

type group struct {
	Name string `json:"name" form:"name" binding:"required"`
}

type Channel struct {
	Name        string `json:"name" form:"name" binding:"required"`
	Description string `json:"description" form:"description" binding:"required"`
}
