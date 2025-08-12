package mapper

import (
	"v/internal/dto"
	"v/pkg/models"
)

func ToConference(conference models.Conference) dto.ConferenceItemResponse {
	return dto.ConferenceItemResponse{
		ID:           conference.ID,
		Title:        conference.Title,
		ScheduledAt:  conference.ScheduledAt.Format("2006-01-02 15:04:05"),
		Participants: ToUsersDTO(conference.Participants),
	}
}

func ToConferences(conferences []models.Conference) []dto.ConferenceItemResponse {
	conferencesDTO := make([]dto.ConferenceItemResponse, len(conferences))
	for i, conference := range conferences {
		conferencesDTO[i] = ToConference(conference)
	}
	return conferencesDTO
}
