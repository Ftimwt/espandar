package dto

type SignupRequest struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	Firstname string `json:"firstname"`
	Lastname  string `json:"lastname"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}
