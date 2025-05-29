package dto

type SignupRequest struct {
	Username  string `json:"username" form:"username"`
	Password  string `json:"password" form:"password"`
	Firstname string `json:"firstname" form:"firstname"`
	Lastname  string `json:"lastname" form:"lastname"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
