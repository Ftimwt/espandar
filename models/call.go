package models

type OfferMessage struct {
	ReceiverID uint   `json:"receiver_id"`
	Offer      string `json:"offer"`
	CallType   string `json:"call_type"`
}

type AnswerMessage struct {
	ReceiverID uint   `json:"receiver_id"`
	Answer     string `json:"answer"`
	CallType   string `json:"call_type"`
}

type ICECandidate struct {
	ReceiverID uint   `json:"receiver_id"`
	Candidate  string `json:"candidate"`
}
