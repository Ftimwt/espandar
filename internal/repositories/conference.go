package repositories

import (
	"gorm.io/gorm"
	"time"
	"v/pkg/models"
)

type ConferenceI interface {
	Create(userID uint, title string, participants []uint, scheduledAt *time.Time) (*models.Conference, error)
	GetByID(id uint) (*models.Conference, error)
	ListUserConferences(userID uint) ([]models.Conference, error)
}

type Conference struct {
	db *gorm.DB
}

func NewConference(db *gorm.DB) *Conference {
	return &Conference{db: db}
}

func (r Conference) Create(userID uint, title string, participants []uint, code string, scheduledAt *time.Time) (*models.Conference, error) {
	users := make([]models.User, len(participants)+1)
	users[0] = models.User{ID: userID}
	for i, id := range participants {
		users[i+1] = models.User{ID: id}
	}

	conf := models.Conference{
		Title:        title,
		CreatorID:    userID,
		ScheduledAt:  scheduledAt,
		Participants: users,
		Code:         code,
	}

	if err := r.db.Create(&conf).Error; err != nil {
		return nil, err
	}

	return &conf, nil
}

func (r Conference) GetByID(id uint) (*models.Conference, error) {
	var conf models.Conference
	if err := r.db.Preload("Participants").First(&conf, id).Error; err != nil {
		return nil, err
	}
	return &conf, nil
}

func (r Conference) ListUserConferences(userID uint) ([]models.Conference, error) {
	var confs []models.Conference
	if err := r.db.
		Joins("JOIN conference_users cu ON cu.conference_id = conferences.id").
		Where("cu.user_id = ? OR conferences.creator_id = ?", userID, userID).
		Preload("Participants").
		Find(&confs).Error; err != nil {
		return nil, err
	}
	return confs, nil
}
