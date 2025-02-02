package controllers

import (
	"Spandar/models"
	"github.com/gin-gonic/gin"
	"net/http"
)

func CreateMessage(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var message models.Message
	if err := c.ShouldBindJSON(&message); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}
	message.UserID = userID
	if err := db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not create"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message create"})
}

func GetMessages(c *gin.Context) {
	userID := c.Param("user_id")
	var messages []models.Message
	if err := db.Where("user_id=?", userID).Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
		return
	}
	c.JSON(http.StatusOK, messages)
}

func UpdateMessage(c *gin.Context) {
	userID := c.Param("user_id")
	messageID := c.Param("message_id")
	var message models.Message
	if err := c.ShouldBindJSON(&message); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}
	if err := db.Model(&message).Where("id=? AND user_id=?", messageID, userID).Updates(message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "massage not update"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message update"})
}

func DeleteMessage(c *gin.Context) {
	userID := c.Param("user_id")
	messageID := c.Param("message_id")
	if err := db.Where("id=? AND user_id=?", messageID, userID).Delete(&models.Message{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "massage not delete"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message delete"})
}
