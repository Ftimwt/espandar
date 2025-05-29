package models

type Message struct {
	ID       uint   `json:"id" gorm:"primaryKey"`
	Text     string `json:"text"`
	Files    []File `json:"files,omitempty" gorm:"many2many:message_files;"`
	SenderID uint   `json:"sender_id"`
}

type File struct {
	ID   uint   `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`
	Path string `json:"path"`
}
