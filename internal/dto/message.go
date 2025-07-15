package dto

type Message struct {
	Text     string `json:"text,omitempty"`
	FileURL  string `json:"file_url,omitempty"`
	FileType string `json:"file_type,omitempty"`
}

