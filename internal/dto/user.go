package dto

type User struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
    Avatar    string `json:"avatar"`
}

type UpdateProfileRequest struct {
	Firstname *string `json:"firstname"`
	Lastname  *string `json:"lastname"`
	Avatar    *string `json:"avatar"`
} 