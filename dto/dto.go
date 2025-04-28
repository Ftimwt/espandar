package dto

type Message struct {
	Content string `json:"content" form:"Content" binding:"omitempty"` // Content اختیاری و مطابق با کلاینت
	Type    string `json:"type" form:"type" binding:"required"`        // type اجباری
}

type group struct {
	Name string `json:"name" form:"name" binding:"required"`
}

type Channel struct {
	Name        string `json:"name" form:"name" binding:"required"`
	Description string `json:"description" form:"description"` // بدون binding:"required"
}
