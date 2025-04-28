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

	// بررسی نقش کاربر (کاربر عادی یا ادمین)
	if user.Role != "user" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only users and admins can create channels"})
		return
	}

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

	// بررسی نقش کاربر
	if user.Role != "user" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only users and admins can create channels"})
		return
	}

	var input struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		UserIDs     []uint `json:"user_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input", "details": err.Error()})
		return
	}

	// بررسی اینکه UserIDs خالی نباشد و شامل خود کاربر نباشد
	if len(input.UserIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one member must be selected"})
		return
	}
	for _, userID := range input.UserIDs {
		if userID == user.ID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot add yourself as a member"})
			return
		}
	}

	// ایجاد کانال
	channel := models.Channel{
		Name:        input.Name,
		Description: input.Description,
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

	// افزودن کاربران انتخاب‌شده
	var members []models.User
	for _, userID := range input.UserIDs {
		var member models.User
		if err := cc.db.First(&member, userID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("user %d not found", userID)})
			return
		}
		members = append(members, member)
	}
	if err := cc.db.Model(&channel).Association("Members").Append(members); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding members to channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "channel created successfully",
		"channel": channel,
	})
}

func (cc *ChannelController) AddMemberToChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	userIDStr := c.Param("user_id")
	user, _ := c.MustGet("user").(*models.User)
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var channel models.Channel
	if err := cc.db.First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	// فقط خالق کانال می‌تواند عضو اضافه کند
	if user.ID != channel.CreatorID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "only the channel creator can add members"})
		return
	}

	var member models.User
	if err := cc.db.First(&member, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("user %d not found", userID)})
		return
	}

	// بررسی اینکه کاربر قبلاً عضو نباشد
	count := cc.db.Model(&channel).Association("Members").Count()
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user is already a member"})
		return
	}

	if err := cc.db.Model(&channel).Association("Members").Append(&member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member added successfully", "channel": channel})
}

func (cc *ChannelController) RemoveMemberFromChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	userIDStr := c.Param("user_id")
	user, _ := c.MustGet("user").(*models.User)

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var channel models.Channel
	if err := cc.db.First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	// فقط خالق کانال می‌تواند عضو حذف کند
	if user.ID != channel.CreatorID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "only the channel creator can remove members"})
		return
	}

	var member models.User
	member.ID = uint(userID)
	if err := cc.db.Model(&channel).Association("Members").Delete(&member); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error removing member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed successfully", "channel": channel})
}

func (cc *ChannelController) LeaveChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	user, _ := c.MustGet("user").(*models.User)

	var channel models.Channel
	if err := cc.db.First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	// خالق کانال نمی‌تواند خارج شود
	if user.ID == channel.CreatorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "channel creator cannot leave the channel"})
		return
	}

	// بررسی اینکه کاربر عضو کانال باشد
	count := cc.db.Model(&channel).Association("Members").Count()
	if count == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you are not a member of this channel"})
		return
	}

	if err := cc.db.Model(&channel).Association("Members").Delete(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error leaving channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "you have left the channel successfully"})
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
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}
	c.JSON(http.StatusOK, channel)
}

func (cc *ChannelController) DeleteChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	user, _ := c.MustGet("user").(*models.User)

	var channel models.Channel
	if err := cc.db.First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	// فقط خالق کانال می‌تواند آن را حذف کند
	if user.ID != channel.CreatorID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "only the channel creator can delete the channel"})
		return
	}

	if err := cc.db.Delete(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error deleting channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "channel deleted successfully"})
}
