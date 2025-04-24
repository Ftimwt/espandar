package controllers

import (
	"espandar/dto"
	"espandar/models"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ChannelController struct {
	db *gorm.DB
}

func NewChannelController(db *gorm.DB) *ChannelController {
	return &ChannelController{db: db}
}

func (cc *ChannelController) CreateChannel(c *gin.Context) {
	user, _ := c.MustGet("user").(*models.User)

	var dto dto.Channel
	if err := c.ShouldBind(&dto); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload", "details": err.Error()})
		return
	}

	channel := models.Channel{
		Name:        dto.Name,
		Description: dto.Description,
		CreatorID:   user.ID,
	}

	if err := cc.db.Create(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating channel"})
		return
	}

	// افزودن خالق به اعضای کانال
	if err := cc.db.Model(&channel).Association("Members").Append(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding creator to channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "channel created successfully", "channel": channel})
}

func (cc *ChannelController) CreateChannelWithMembers(c *gin.Context) {
	user, _ := c.MustGet("user").(*models.User)

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		UserIDs     []uint `json:"user_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	channel := models.Channel{
		Name:        input.Name,
		Description: input.Description,
		CreatorID:   user.ID,
	}
	if err := cc.db.Create(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating channel"})
		return
	}

	// افزودن خالق به کانال
	if err := cc.db.Model(&channel).Association("Members").Append(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding creator to channel"})
		return
	}

	// افزودن کاربران انتخاب‌شده
	for _, userID := range input.UserIDs {
		var member models.User
		member.ID = userID
		if err := cc.db.Model(&channel).Association("Members").Append(&member); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error adding user %d to channel", userID)})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "channel created successfully", "channel": channel})
}

func (cc *ChannelController) AddMemberToChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	userIDStr := c.Param("user_id")

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var channel models.Channel
	if err := cc.db.First(&channel, &channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	if userID != uint64(channel.CreatorID) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "you do not have access to add member"})
		return
	}

	var user models.User
	user.ID = uint(userID)
	if err := cc.db.Model(&channel).Association("Members").Append(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member added successfully", "channel": channel})
}

func (cc *ChannelController) RemoveMemberFromChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	userIDStr := c.Param("user_id")

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var channel models.Channel
	if err := cc.db.First(&channel, &channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	if userID != uint64(channel.CreatorID) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "you do not have access to remove member"})
		return
	}

	var user models.User
	user.ID = uint(userID)
	if err := cc.db.Model(&channel).Association("Members").Delete(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error removing member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed successfully", "channel": channel})
}

func (cc *ChannelController) GetChannels(c *gin.Context) {
	pageStr := c.Query("page")
	perPageStr := c.Query("perpage")

	if pageStr == "" || perPageStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page and perpage query parameters are required"})
		return
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page number"})
		return
	}

	perPage, err := strconv.Atoi(perPageStr)
	if err != nil || perPage <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid perpage number"})
		return
	}
	offset := (page - 1) * perPage

	var channels []models.Channel
	if err := cc.db.Offset(offset).Limit(perPage).Find(&channels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error retrieving channels"})
		return
	}

	var totalChannels int64
	cc.db.Model(&models.Channel{}).Count(&totalChannels)

	c.JSON(http.StatusOK, gin.H{"page": page, "per_page": perPage, "total": totalChannels, "channels": channels})
}

func (cc *ChannelController) GetChannel(c *gin.Context) {
	channelID := c.Param("id")
	var channel models.Channel
	if err := cc.db.Preload("Members").First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel not found"})
		return
	}
	c.JSON(http.StatusOK, channel)
}

func (cc *ChannelController) DeleteChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	userID := c.MustGet("user").(*models.User).ID

	var channel models.Channel
	if err := cc.db.Where("id = ?", channelID).First(&channel).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	if userID != channel.CreatorID {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "you do not have access to delete channel"})
		return
	}

	if err := cc.db.Delete(&models.Channel{}, channelID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error deleting channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "channel deleted successfully"})
}
