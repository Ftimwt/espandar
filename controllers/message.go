package controllers

import (
	"espandar/dto"
	"espandar/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func SendMessage(c *gin.Context) {
	var formData dto.Message

	if err := c.ShouldBindJSON(&formData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	message := models.Message{}
	message.Content = formData.Text
	message.SenderID = c.MustGet("user").(*models.User).ID

	receiverType := c.Param("receiver_type")
	receiverID, _ := strconv.Atoi(c.Param("receiver_id"))
	voice, err := c.FormFile("voice")
	form, _ := c.MultipartForm()
	attachment := form.File["attachment"]
	pircutres := form.File["picture"]

	for _, file := range attachment {
		file.Open()
	}

	switch receiverType {
	case "user":
		message.UserID = uint(receiverID)
	case "group":
		message.UserID = uint(receiverID)
	case "channel":
		message.UserID = uint(receiverID)
	default:
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exists"})
		return
	}

	if err := db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not send"})
		return
	}
}

func GetMessages(c *gin.Context) {
	var formData dto.Message

	receiverType := c.Param("receiver_type")
	receiverID, _ := strconv.Atoi(c.Param("receiver_id"))

	switch receiverType {
	case "user":
		message.UserID = uint(receiverID)
		break
	default:
		c.JSON(http.StatusNotFound, gin.H{
			"error": "receiver type does not exists",
		})
		break
	}

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
