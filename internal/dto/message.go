package dto

type Message struct {
	Text  string `json:"text,omitempty"`
	Files []uint `json:"files,omitempty"`
}
