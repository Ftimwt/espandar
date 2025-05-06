package mapper

import (
	"espandar/dto"
	"espandar/models"
	"gorm.io/gorm"
)

func ToChannelModel(channel models.Channel) dto.ChannelModel {
	return dto.ChannelModel{
		ID:          0,
		Name:        channel.Name,
		Description: channel.Description,
		Members:     ToUsersModels(channel.Members),
		CreatedAt:   channel.CreatedAt,
		UpdatedAt:   channel.UpdatedAt,
	}
}

func ToChannelResponse(message string, channel models.Channel) dto.ChannelResponse {
	return dto.ChannelResponse{
		Message: message,
		Channel: ToChannelModel(channel),
	}
}

func ChannelRequestToModel(creator uint, req dto.ChannelRequest) models.Channel {
	members := make([]models.User, len(req.Members))
	for i, member := range req.Members {
		members[i] = models.User{
			Model: gorm.Model{ID: member},
		}
	}
	return models.Channel{
		Name:        req.Name,
		CreatorID:   creator,
		Description: req.Description,
		Members:     members,
	}
}
