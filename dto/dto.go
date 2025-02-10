package dto

import "mime/multipart"

type File struct {
	fileHeader multipart.FileHeader
}

type Message struct {
	Content      string
	ReceiverType string
	ReceiverID   uint
	MessageType  string
	Files        []File
}
