package controllers

import (
	"espandar/dto"
	"espandar/encryption"
	"espandar/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

var aesCipher = encryption.NewAESCipher()
var userStatus = make(map[string]bool)

type Broadcaster interface {
	BroadcastToUser(userID uint, event string, args ...interface{})
}

type MessageController struct {
	db          *gorm.DB
	broadcaster Broadcaster
}

func NewMessageController(db *gorm.DB, broadcaster Broadcaster) *MessageController {
	return &MessageController{db: db, broadcaster: broadcaster}
}

func (mc *MessageController) SendMessage(c *gin.Context) {
	var formData dto.Message

	if err := c.ShouldBind(&formData); err != nil {
		log.Println("error binding form data:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	receiverType := c.Param("receiver_type")
	receiverID := c.Param("receiver_id")

	formContent, err := c.MultipartForm()
	if err != nil {
		log.Println("error parsing form:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "unable to parse form"})
		return
	}

	content := formContent.Value["content"]
	if len(content) == 0 || content[0] == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	encryptedContent, err := aesCipher.Encrypt(content[0])
	if err != nil {
		log.Println("error encrypting message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error encrypting message"})
		return
	}

	receiverIDUint, err := strconv.Atoi(receiverID)
	if err != nil {
		log.Println("invalid receiver id:", "error:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver id"})
		return
	}

	user, _ := c.MustGet("user").(*models.User)

	message := models.Message{
		Content:    encryptedContent,
		SenderID:   user.ID,
		IsReceived: false,
		Seen:       false,
	}

	var chat models.Chat
	switch receiverType {
	case "user":
		message.UserID = uint(receiverIDUint)
		if err := mc.db.Where("user_id_1 = ? AND user_id_2 = ?", user.ID, receiverIDUint).
			Or("user_id_1 = ? AND user_id_2 = ?", receiverIDUint, user.ID).
			First(&chat).Error; err != nil {
			chat = models.Chat{
				UserID1: user.ID,
				UserID2: uint(receiverIDUint),
			}
			if err := mc.db.Create(&chat).Error; err != nil {
				log.Println("error creating chat:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating chat"})
				return
			}
		}
		message.ChatID = chat.ID
	case "group":
		message.GroupID = uint(receiverIDUint)
		var member models.GroupMember
		if err := mc.db.Where("group_id = ? AND user_id = ?", receiverIDUint, user.ID).First(&member).Error; err != nil {
			log.Println("user not a group member:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not a group member"})
			return
		}
	case "channel":
		message.ChannelID = uint(receiverIDUint)
		var channel models.Channel
		if err := mc.db.Where("id = ?", receiverIDUint).Preload("Members").First(&channel).Error; err != nil {
			log.Println("channel not found:", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
			return
		}
		isMember := false
		for _, member := range channel.Members {
			if member.ID == user.ID {
				isMember = true
				break
			}
		}
		if !isMember {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not a channel member"})
			return
		}
	default:
		log.Println("receiver type does not exist:", receiverType)
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exist"})
		return
	}

	if err := mc.db.Create(&message).Error; err != nil {
		log.Println("error sending message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not sent"})
		return
	}

	if receiverType == "user" {
		mc.broadcaster.BroadcastToUser(uint(receiverIDUint), "new_message", message)
	}

	files := formContent.File["files"]
	if len(files) > 0 {
		for _, fileHeader := range files {
			filePath := "./Uploads/" + fileHeader.Filename

			if err := c.SaveUploadedFile(fileHeader, filePath); err != nil {
				log.Println("error saving file:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "file doesn't save"})
				return
			}

			newFile := models.File{
				FilePath: filePath,
				Type:     mc.FileType(fileHeader.Filename),
			}

			if err := mc.db.Create(&newFile).Error; err != nil {
				log.Println("unable to save file:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to save file"})
				return
			}

			message.Files = append(message.Files, newFile)
		}
	}

	if err := mc.db.Model(&message).Updates(models.Message{Files: message.Files}).Error; err != nil {
		log.Println("error updating message information:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error updating message information"})
		return
	}

	log.Println("message sent successfully:", message.ID)
	c.JSON(http.StatusOK, gin.H{"message": "message sent successfully", "message_id": message.ID})
}

func (mc *MessageController) FileType(fileName string) models.FileType {
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

func (mc *MessageController) GetMessages(c *gin.Context) {
	userID := c.MustGet("user").(*models.User).ID

	receiverType := c.Param("receiver_type")
	receiverID, err := strconv.Atoi(c.Param("receiver_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver id"})
		return
	}

	lastMessageIDStr := c.Query("last_messageid")
	var lastMessageID int
	if lastMessageIDStr != "" {
		lastMessageID, err = strconv.Atoi(lastMessageIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message id"})
			return
		}
	}

	var messages []models.Message

	switch receiverType {
	case "user":
		if err := mc.db.Where("(user_id = ? AND sender_id = ?) OR (user_id = ? AND sender_id = ?) AND id > ?", userID, receiverID, receiverID, userID, lastMessageID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "group":
		if err := mc.db.Where("group_id = ? AND id > ?", receiverID, lastMessageID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "channel":
		if err := mc.db.Where("channel_id = ? AND id > ?", receiverID, lastMessageID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	default:
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exist"})
		return
	}

	isOnline := userStatus[fmt.Sprintf("user_%d", receiverID)]

	for i := range messages {
		if messages[i].UserID == userID {
			messages[i].IsReceived = isOnline
			messages[i].Seen = messages[i].Seen || isOnline
		} else {
			messages[i].IsReceived = false
			messages[i].Seen = false
		}

		decryptedContent, err := aesCipher.Decrypt(messages[i].Content)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error decrypting message"})
			return
		}
		messages[i].Content = decryptedContent
	}

	for _, message := range messages {
		if err := mc.db.Model(&message).Updates(models.Message{IsReceived: message.IsReceived, Seen: message.Seen}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error updating message status"})
			return
		}
	}
	c.JSON(http.StatusOK, messages)
}

func (mc *MessageController) UpdateMessage(c *gin.Context) {
	userID := c.MustGet("user").(*models.User).ID
	messageID := c.Param("message_id")

	var updatedMessage models.Message

	if err := c.ShouldBindJSON(&updatedMessage); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	if err := mc.db.Model(&updatedMessage).Where("id=? AND user_id=?", messageID, userID).Updates(models.Message{Content: updatedMessage.Content, Seen: updatedMessage.Seen, IsReceived: updatedMessage.IsReceived}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not updated"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message updated"})
}

func (mc *MessageController) DeleteMessage(c *gin.Context) {
	userID := c.MustGet("user").(*models.User).ID
	messageID := c.Param("message_id")
	if err := mc.db.Where("id=? AND user_id=?", messageID, userID).Delete(&models.Message{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not deleted"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "message deleted"})
}
