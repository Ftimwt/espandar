package controllers

import (
	"espandar/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
)

func CreateChannel(c *gin.Context) {

	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header is missing"})
		return
	}

	userID := c.MustGet("user").(*models.User).ID

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user does not exist"})
		return
	}

	var channel models.Channel
	if err := c.ShouldBind(&channel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	channel.CreatorID = uint(userID)

	if err := db.Create(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "channel create successfully", "channel": channel})
}

func AddMemberToChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	var channel models.Channel
	if err := db.First(&channel, &channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	if err := db.Model(&channel).Association("Members").Append(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member added successfully", "channel": channel})
}

func RemoveMemberFromChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	userIDStr := c.Param("user_id")

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
	}

	var channel models.Channel
	if err := db.First(&channel, &channelID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
		return
	}

	var user models.User
	user.ID = uint(userID)
	if err := db.Model(&channel).Association("Members").Delete(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error removing member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed successfully", "channel": channel})
}

func GetChannels(c *gin.Context) {
	var channels []models.Channel
	if err := db.Find(&channels).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error retrieving channels"})
		return
	}
	c.JSON(http.StatusOK, channels)
}

func GetChannel(c *gin.Context) {
	channelID := c.Param("id")
	var channel models.Channel
	if err := db.First(&channel, channelID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "channel not found"})
		return
	}
	c.JSON(http.StatusOK, channel)
}

func DeleteChannel(c *gin.Context) {
	channelID := c.Param("channel_id")
	if err := db.Delete(&models.Channel{}, channelID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error deleting channel"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "channel deleted successfully"})
}
