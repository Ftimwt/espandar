package models

import (
	"gorm.io/gorm"
)

type Call struct {
	gorm.Model
	ID         uint   `json:"primaryKey"`
	CallerID   uint   `json:"caller_id"`
	ReceiverID uint   `json:"receiver_id"`
	Status     string `json:"status"`
	CallType   string `json:"call_type"`
	Offer      string `json:"offer"`
	Answer     string `json:"answer"`
}

type OfferMessage struct {
	ID         uint   `json:"primaryKey"`
	ReceiverID uint   `json:"receiver_id"`
	Offer      string `json:"offer"`
	CallType   string `json:"call_type"`
}

type AnswerMessage struct {
	ID         uint   `json:"primaryKey"`
	ReceiverID uint   `json:"receiver_id"`
	Answer     string `json:"answer"`
	CallType   string `json:"call_type"`
}

type ICECandidate struct {
	ID         uint   `json:"primaryKey"`
	ReceiverID uint   `json:"receiver_id"`
	Candidate  string `json:"candidate"`
}
