package dto

type ConferenceCreateRequest struct {
	Title        string  `json:"title"`
	Participants []uint  `json:"participants"`
	ScheduledAt  *string `json:"scheduled_at,omitempty"` // ISO8601 format
}
