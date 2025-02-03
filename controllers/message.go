package controllers

import (
	"Spandar/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
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

func SendMessage(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var message models.Message

	if err := c.ShouldBindJSON(&message); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}
	message.UserID = userID
	message.Type = "text"

	if err := db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error sending message"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message send successfully"})
}

func SendMediaMessage(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	groupIDstr := c.Param("group_id")

	groupID64, err := strconv.ParseUint(groupIDstr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid group ID"})
		return
	}
	groupID := uint(groupID64)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fole is received"})
		return
	}

	if err := c.SaveUploadedFile(file, "./uploads"+file.Filename); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file"})
		return
	}

	message := models.Message{
		UserID:  userID,
		GroupID: groupID,
		Content: file.Filename,
		Type:    "media",
	}
	if err := db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error sending message"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message send successfully"})
}

func GetMessages(c *gin.Context) {
	groupID := c.Param("group_id")
	var messages []models.Message

	if err := db.Where("group_id=?", groupID).Find(&messages).Error; err != nil {
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
