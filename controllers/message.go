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
		log.Println("SendMessage: Error binding form data:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	receiverType := c.Param("receiver_type")
	receiverID := c.Param("receiver_id")

	// اعتبارسنجی اولیه
	if receiverID == "" || receiverID == "undefined" {
		log.Printf("SendMessage: Invalid receiver ID: %s", receiverID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver ID cannot be empty or undefined"})
		return
	}

	receiverIDUint, err := strconv.Atoi(receiverID)
	if err != nil {
		log.Printf("SendMessage: Invalid receiver ID format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver ID format"})
		return
	}

	formContent, err := c.MultipartForm()
	if err != nil {
		log.Println("SendMessage: Error parsing form:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "unable to parse form"})
		return
	}

	content := formContent.Value["content"]
	messageType := formContent.Value["type"]
	if len(messageType) == 0 {
		if len(content) > 0 && content[0] != "" {
			messageType = []string{"text"}
		} else if len(formContent.File["files"]) > 0 {
			messageType = []string{"file"}
		} else {
			log.Println("SendMessage: No content or file provided")
			c.JSON(http.StatusBadRequest, gin.H{"error": "content or file is required"})
			return
		}
	}

	var encryptedContent string
	if messageType[0] == "text" && len(content) > 0 && content[0] != "" {
		encryptedContent, err = aesCipher.Encrypt(content[0])
		if err != nil {
			log.Println("SendMessage: Error encrypting message:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error encrypting message"})
			return
		}
	}

	user, _ := c.MustGet("user").(*models.User)
	log.Printf("SendMessage: Sender ID: %d, Receiver ID: %d, Type: %s", user.ID, receiverIDUint, receiverType)

	var receiverUser models.User
	if receiverType == "user" {
		if err := mc.db.Where("id = ?", receiverIDUint).First(&receiverUser).Error; err != nil {
			log.Println("SendMessage: Receiver not found:", err)
			c.JSON(http.StatusNotFound, gin.H{"error": "receiver not found"})
			return
		}
	}

	message := models.Message{
		Content:    encryptedContent,
		SenderID:   user.ID,
		Type:       messageType[0],
		UserID:     uint(receiverIDUint),
		IsReceived: false,
		Seen:       false,
	}

	var chat models.Chat
	switch receiverType {
	case "user":
		message.UserID = receiverUser.ID
		log.Printf("SendMessage: Checking chat between User %d and User %d", user.ID, receiverUser.ID)
		if err := mc.db.Where("user_id_1 = ? AND user_id_2 = ?", user.ID, receiverUser.ID).
			Or("user_id_1 = ? AND user_id_2 = ?", receiverUser.ID, user.ID).
			First(&chat).Error; err != nil {
			log.Println("SendMessage: Creating new chat")
			chat = models.Chat{
				UserID1: user.ID,
				UserID2: receiverUser.ID,
			}
			if err := mc.db.Create(&chat).Error; err != nil {
				log.Println("SendMessage: Error creating chat:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating chat"})
				return
			}
			log.Printf("SendMessage: Chat created, ID: %d", chat.ID)
		}
		message.ChatID = chat.ID
	case "group":
		message.GroupID = uint(receiverIDUint)
		var member models.GroupMember
		if err := mc.db.Where("group_id = ? AND user_id = ?", receiverIDUint, user.ID).First(&member).Error; err != nil {
			log.Println("SendMessage: User not a group member:", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not a group member"})
			return
		}
	case "channel":
		message.ChannelID = uint(receiverIDUint)
		var channel models.Channel
		if err := mc.db.Where("id = ?", receiverIDUint).Preload("Members").First(&channel).Error; err != nil {
			log.Println("SendMessage: Channel not found:", err)
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
			log.Println("SendMessage: User not a channel member")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not a channel member"})
			return
		}
	default:
		log.Println("SendMessage: Invalid receiver type:", receiverType)
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exist"})
		return
	}

	files := formContent.File["files"]
	var filePaths []models.File
	if len(files) > 0 {
		for _, fileHeader := range files {
			filePath := fmt.Sprintf("./Uploads/%s", fileHeader.Filename)
			if err := c.SaveUploadedFile(fileHeader, filePath); err != nil {
				log.Println("SendMessage: Error saving file:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "file doesn't save"})
				return
			}

			newFile := models.File{
				FilePath: fmt.Sprintf("/uploads/%s", fileHeader.Filename), // مسیر قابل دسترسی
				Type:     mc.FileType(fileHeader.Filename),
			}

			if err := mc.db.Create(&newFile).Error; err != nil {
				log.Println("SendMessage: Error saving file to DB:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to save file"})
				return
			}

			filePaths = append(filePaths, newFile)
		}
		message.Files = filePaths
	}

	if err := mc.db.Create(&message).Error; err != nil {
		log.Println("SendMessage: Error creating message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not sent"})
		return
	}

	response := gin.H{
		"message":     "message sent successfully",
		"message_id":  message.ID,
		"content":     encryptedContent,
		"sender_id":   message.SenderID,
		"receiver_id": message.UserID,
		"created_at":  message.CreatedAt,
		"seen":        message.Seen,
		"is_received": message.IsReceived,
		"type":        message.Type,
		"files":       message.Files,
	}

	if receiverType == "user" {
		log.Printf("SendMessage: Broadcasting to user %d, event: new_message", receiverUser.ID)
		mc.broadcaster.BroadcastToUser(receiverUser.ID, "new_message", response)
	}

	log.Printf("SendMessage: Message sent successfully, ID: %d", message.ID)
	c.JSON(http.StatusOK, response)
}

func (mc *MessageController) FileType(fileName string) models.FileType {
	if len(fileName) > 0 {
		switch {
		case strings.HasSuffix(fileName, ".mp3") || strings.HasSuffix(fileName, ".wav") || strings.HasSuffix(fileName, ".webm"):
			return models.Voice
		case strings.HasSuffix(fileName, ".jpg") || strings.HasSuffix(fileName, ".png") || strings.HasSuffix(fileName, ".jpeg"):
			return models.Picture
		case strings.HasSuffix(fileName, ".mp4"):
			return models.Video
		default:
			return models.Default
		}
	}
	return models.Default
}

func (mc *MessageController) GetMessages(c *gin.Context) {
	userID := c.MustGet("user").(*models.User).ID
	receiverType := c.Param("receiver_type")
	receiverIDStr := c.Param("receiver_id")

	// اعتبارسنجی اولیه
	if receiverIDStr == "" || receiverIDStr == "undefined" {
		log.Printf("GetMessages: Invalid receiver ID: %s", receiverIDStr)
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver ID cannot be empty or undefined"})
		return
	}

	receiverID, err := strconv.Atoi(receiverIDStr)
	if err != nil {
		log.Printf("GetMessages: Invalid receiver ID format: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver ID format"})
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
		if err := mc.db.
			Where("(user_id = ? AND sender_id = ?) OR (user_id = ? AND sender_id = ?) AND id > ?", userID, receiverID, receiverID, userID, lastMessageID).
			Preload("Files").
			Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "group":
		if err := mc.db.
			Where("group_id = ? AND id > ?", receiverID, lastMessageID).
			Preload("Files").
			Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "channel":
		if err := mc.db.
			Where("channel_id = ? AND id > ?", receiverID, lastMessageID).
			Preload("Files").
			Find(&messages).Error; err != nil {
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

		if messages[i].Content != "" {
			decryptedContent, err := aesCipher.Decrypt(messages[i].Content)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "error decrypting message"})
				return
			}
			messages[i].Content = decryptedContent
		}
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
