package dto

type LoginRequest struct {
	Username string `json:"username" form:"username" binding:"required"`
	Password string `json:"password" form:"password" binding:"required"`
}

type LoginResponse struct {
	Token  string `json:"token"`
	UserID uint   `json:"user_id"`
}

type LoginAdminResponse struct {
	Token  string `json:"token"`
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
}
