package controllers

import (
	"espandar/dto"
	"espandar/models"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

func SendMessage(c *gin.Context) {
	var formData dto.Message

	if err := c.ShouldBind(&formData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	receiverType := c.Param("receiver_type")
	receiverID := c.Param("receiver_id")

	formContent, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unable to parse form"})
		return
	}

	content := formContent.Value["content"][0]

	receiverIDUint, err := strconv.Atoi(receiverID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver id"})
		return
	}

	message := models.Message{
		Content:  content,
		SenderID: c.MustGet("user").(*models.User).ID,
	}

	switch receiverType {
	case "user":
		message.UserID = uint(receiverIDUint)
	case "group":
		message.UserID = uint(receiverIDUint)
	case "channel":
		message.UserID = uint(receiverIDUint)
	default:
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exists"})
		return
	}

	if err := db.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not send"})
		return
	}

	files := formContent.File["files"]
	if len(files) > 0 {
		for _, fileHeader := range files {
			filePath := "./uploads/" + fileHeader.Filename

			if err := c.SaveUploadedFile(fileHeader, filePath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "file dosent save"})
				return
			}

			newFile := models.File{
				FilePath: filePath,
				Type:     FileType(fileHeader.Filename),
			}

			if err := db.Create(&newFile).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to save file"})
				return
			}

			message.Files = append(message.Files, newFile)
		}
	}

	if err := db.Model(&message).Updates(models.Message{Files: message.Files}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error updating message information"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "mesaage sent successfully", "message_id": message.ID})
}

func FileType(fileName string) models.FileType {
	if len(fileName) > 0 {
		switch {
		case strings.HasSuffix(fileName, ".mp3") || strings.HasSuffix(fileName, ".wav"):
			return models.Voice
		case strings.HasSuffix(fileName, ".jpg") || strings.HasSuffix(fileName, ".png") || strings.HasSuffix(fileName, ".jpeg"):
			return models.Picture
		default:
			return models.Default

		}
	}
	return models.Default
}

func GetMessages(c *gin.Context) {

	tokenString := c.GetHeader("Authorization")
	if tokenString == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header is missing"})
		return
	}

	userID := c.MustGet("user").(*models.User).ID

	receiverType := c.Param("receiver_type")
	receiverID, err := strconv.Atoi(c.Param("receiver_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver id"})
		return
	}

	var messages []models.Message

	switch receiverType {
	case "user":
		if err := db.Where("(user_id = ? AND sender_id = ?) OR (user_id = ? AND sender_id = ?)", userID, receiverID, receiverID, userID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "group":
		if err := db.Where("group_id = ?", receiverID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "channel":
		if err := db.Where("channel_id = ?", receiverID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	default:
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exists"})
		return
	}
	c.JSON(http.StatusOK, messages)
}

func UpdateMessage(c *gin.Context) {
	userID := c.Param("user_id")
	messageID := c.Param("message_id")

	var updatedMessage models.Message

	if err := c.ShouldBindJSON(&updatedMessage); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	if err := db.Model(&updatedMessage).Where("id=? AND user_id=?", messageID, userID).Updates(models.Message{Content: updatedMessage.Content}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "massage not updated"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message updated"})
}

func DeleteMessage(c *gin.Context) {
	userID := c.Param("user_id")
	messageID := c.Param("message_id")
	if err := db.Where("id=? AND user_id=?", messageID, userID).Delete(&models.Message{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "massage not deleted"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message deleted"})
}
