package dto

import (
    "v/pkg/models" 
	"time"
)

type Message struct {
	Text  string `json:"text,omitempty"`
	Files []uint `json:"files,omitempty"`
}

type MessageResponse struct {
	ID            uint          `json:"id"`
	Text          string        `json:"text"`
	Sender        UserPublic    `json:"sender"`
	CreatedAt     time.Time     `json:"CreatedAt"`
	IsEdited      bool          `json:"is_edited"`
	Files         []File        `json:"files,omitempty"`
	ForwardedFrom *string       `json:"forwarded_from,omitempty"`
}

type File struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Path string `json:"path"`
	Type string `json:"type"`
}

type UserPublic struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
}

func ToUserPublic(user *models.User) UserPublic {
	return UserPublic{
		ID:       user.ID,
		Username: user.Username,
	}
}

func ConvertFiles(files []models.File) []File {
	var result []File
	for _, f := range files {
		result = append(result, File{
			ID:   f.ID,
			Name: f.Name,
			Path: f.Path,
			Type: string(f.Type),
		})
	}
	return result
}
