package services

import (
	"fmt"
	"log"
	"time"
	"v/pkg/utils"
	"errors"

	"v/internal/dto"
	"v/internal/repositories"
	"v/pkg/models"
	"v/pkg/providers"
)

var ErrConferenceNotStarted = errors.New("conference has not started yet")

type Conference struct {
	repo        *repositories.Conference
	notifier    *providers.Notifier
	userRepo    *repositories.User
	userService *User
	frontendURL string
}

func NewConference(
	repo *repositories.Conference,
	notifier *providers.Notifier,
	userRepo *repositories.User,
	userService *User,
	frontendURL string,
) *Conference {
	return &Conference{
		repo:        repo,
		notifier:    notifier,
		userRepo:    userRepo, // 👈
		userService: userService,
		frontendURL: frontendURL,
	}
}

func (s Conference) CreateConference(userID uint, req dto.ConferenceCreateRequest) (*models.Conference, string, error) {
	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		if t, err := time.Parse(time.RFC3339, *req.ScheduledAt); err == nil {
			scheduledAt = &t
		}
	}
	code := s.generateMeetLikeCode()
	model, err := s.repo.Create(userID, req.Title, req.Participants, code, scheduledAt)
	return model, code, err
}

func (s Conference) GetUserConferences(userID uint) ([]models.Conference, error) {
	return s.repo.ListUserConferences(userID)
}

func (s Conference) GetByID(id uint) (*models.Conference, error) {
	conference, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if conference.ScheduledAt != nil && conference.ScheduledAt.After(time.Now()) {
		return nil, ErrConferenceNotStarted
	}

	return conference, nil
}

func (s Conference) SendInvitations(conferenceID uint, participantIDs []uint) error {
	conference, err := s.repo.GetByID(conferenceID)
	if err != nil {
		return err
	}

	senderID := conference.CreatorID
	url := fmt.Sprintf("%s/conference/%d", s.frontendURL, conferenceID)
	text := fmt.Sprintf("You have been invited to the conference: %s 🎥", url)

	for _, participantID := range participantIDs {
		_, err := s.userService.SendMessage(senderID, participantID, dto.Message{Text: text})
		if err != nil {
			log.Printf("❌ ارسال پیام به کاربر %d با خطا مواجه شد: %v", participantID, err)
			continue
		}
	}

	return nil
}

func (s Conference) generateMeetLikeCode() string {
	return fmt.Sprintf("%s-%s-%s", utils.GenerateRandomString(3), utils.GenerateRandomString(4), utils.GenerateRandomString(3))
}
