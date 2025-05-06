package dto

type UserModel struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Phone    string `json:"phone"`
	Role     string `json:"role"`
}
