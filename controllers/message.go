package controllers

import (
	"espandar/dto"
	"espandar/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"strings"
)

func SendMessage(c *gin.Context) {
	var formData dto.Message

	if err := c.ShouldBindJSON(&formData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	message := models.Message{
		Content:  formData.Content,
		SenderID: c.MustGet("user").(*models.User).ID,
		Type:     formData.MessageType,
	}

	receiverType := formData.ReceiverType
	receiverID := formData.ReceiverID

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

	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unable to parse form"})
		return
	}

	files := c.MultipartForm.File["files"]
	if len(files) > 0 {
		for _, fileHeader = range files {
			filePath := "./uploads/" + fileHeader.FileName

			if err := c.SaveUploadedFile(fileHeader, filePath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "file dosent save"})
				return
			}

			newFile := models.File{
				FilePath: filePath,
				Type:     determineFileType(fileHeader.FileName),
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
