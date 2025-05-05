package controllers

import (
	"encoding/json"
	"espandar/encryption" // بسته encryption
	"espandar/models"
	"espandar/websocket"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MessageController struct {
	db          *gorm.DB
	broadcaster *websocket.SocketBroadcaster
	aesCipher   *encryption.AESCipher
}

func NewMessageController(db *gorm.DB, broadcaster *websocket.SocketBroadcaster) *MessageController {
	return &MessageController{
		db:          db,
		broadcaster: broadcaster,
		aesCipher:   encryption.NewAESCipher(), // استفاده از AESCipher
	}
}

func (mc *MessageController) SendMessage(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	receiverType := c.Param("receiver_type")
	receiverID := c.Param("receiver_id")
	roomID := c.Query("room_id")

	if receiverID == "" {
		log.Printf("SendMessage: Receiver ID is empty")
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver ID is required"})
		return
	}

	var receiverIDUint uint
	id, err := strconv.ParseUint(receiverID, 10, 32)
	if err != nil {
		log.Printf("SendMessage: Invalid receiver ID: %s, error: %v", receiverID, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver ID"})
		return
	}
	receiverIDUint = uint(id)

	// دریافت داده‌های فرم
	formContent, err := c.MultipartForm()
	if err != nil {
		log.Printf("SendMessage: Invalid form data: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid form data"})
		return
	}

	// پردازش محتوا
	var content string
	if contentValues, ok := formContent.Value["content"]; ok && len(contentValues) > 0 {
		content = contentValues[0]
	}

	// پردازش نوع پیام
	var messageType string
	if typeValues, ok := formContent.Value["type"]; ok && len(typeValues) > 0 {
		messageType = typeValues[0]
	} else {
		messageType = "text"
		if len(formContent.File["files"]) > 0 {
			fileHeader := formContent.File["files"][0]
			contentType := fileHeader.Header.Get("Content-Type")
			switch {
			case strings.HasPrefix(contentType, "image/"):
				messageType = "picture"
			case strings.HasPrefix(contentType, "audio/"):
				messageType = "voice"
			case strings.HasPrefix(contentType, "video/"):
				messageType = "video"
			}
		}
	}

	// رمزنگاری محتوا
	encryptedContent, err := mc.aesCipher.Encrypt(content)
	if err != nil {
		log.Printf("SendMessage: Encryption error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "encryption error"})
		return
	}

	// پردازش تگ‌ها
	var tagsJSON string
	var tags []models.Tag
	if tagValues, ok := formContent.Value["tags"]; ok && len(tagValues) > 0 {
		tagsJSON = tagValues[0]
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
				log.Printf("SendMessage: Invalid tags format: %v", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tags format"})
				return
			}
			for _, tag := range tags {
				switch tag.Type {
				case "user":
					var user models.User
					if err := mc.db.Where("id = ?", tag.ID).First(&user).Error; err != nil {
						log.Printf("SendMessage: Invalid user ID: %d, error: %v", tag.ID, err)
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid user ID: %d", tag.ID)})
						return
					}
				case "file":
					var file models.File
					if err := mc.db.Where("id = ?", tag.ID).First(&file).Error; err != nil {
						log.Printf("SendMessage: Invalid file ID: %d, error: %v", tag.ID, err)
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid file ID: %d", tag.ID)})
						return
					}
				case "workflow":
					var workflow models.Workflow
					if err := mc.db.Where("id = ?", tag.ID).First(&workflow).Error; err != nil {
						log.Printf("SendMessage: Invalid workflow ID: %d, error: %v", tag.ID, err)
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid workflow ID: %d", tag.ID)})
						return
					}
				default:
					log.Printf("SendMessage: Invalid tag type: %s", tag.Type)
					c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid tag type: %s", tag.Type)})
					return
				}
			}
		}
	}

	// پیدا کردن یا ایجاد Chat
	var chat models.Chat
	if err := mc.db.Where("(user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
		user.ID, receiverIDUint, receiverIDUint, user.ID).First(&chat).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			chat = models.Chat{
				UserID1: user.ID,
				UserID2: receiverIDUint,
			}
			if err := mc.db.Create(&chat).Error; err != nil {
				log.Printf("SendMessage: Error creating chat: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating chat"})
				return
			}
		} else {
			log.Printf("SendMessage: Error finding chat: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error finding chat"})
			return
		}
	}

	// ایجاد پیام
	message := models.Message{
		Content:  encryptedContent,
		SenderID: user.ID,
		Type:     messageType,
		Tags:     tagsJSON,
		RoomID:   &roomID,
		ChatID:   chat.ID,
	}

	// تنظیم گیرنده پیام
	switch strings.ToLower(receiverType) {
	case "user":
		userIDPtr := new(uint)
		*userIDPtr = receiverIDUint
		message.UserID = userIDPtr
	case "group":
		groupIDPtr := new(uint)
		*groupIDPtr = receiverIDUint
		message.GroupID = groupIDPtr
	case "channel":
		channelIDPtr := new(uint)
		*channelIDPtr = receiverIDUint
		message.ChannelID = channelIDPtr
	default:
		log.Printf("SendMessage: Invalid receiver type: %s", receiverType)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver type"})
		return
	}

	// آپلود فایل‌ها به S3
	files := formContent.File["files"]
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			log.Printf("SendMessage: Error reading file %s: %v", fileHeader.Filename, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error reading file"})
			return
		}
		defer file.Close()

		filePath, err := mc.UploadFileToS3(fileHeader)
		if err != nil {
			log.Printf("SendMessage: Error uploading file %s: %v", fileHeader.Filename, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error uploading file"})
			return
		}
		newFile := models.File{
			FilePath: filePath,
			Type:     mc.FileType(fileHeader.Filename, file),
		}
		message.Files = append(message.Files, newFile)
	}

	// ذخیره پیام در دیتابیس
	if err := mc.db.Create(&message).Error; err != nil {
		log.Printf("SendMessage: Error saving message: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error saving message"})
		return
	}

	// ذخیره فایل‌ها
	for i := range message.Files {
		message.Files[i].MessageID = message.ID
		if err := mc.db.Create(&message.Files[i]).Error; err != nil {
			log.Printf("SendMessage: Error saving file: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error saving file"})
			return
		}
	}

	// رمزگشایی محتوا برای پاسخ
	decryptedContent, err := mc.aesCipher.Decrypt(encryptedContent)
	if err != nil {
		log.Printf("SendMessage: Decryption error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "decryption error"})
		return
	}
	// آماده‌سازی پاسخ
	response := gin.H{
		"ID":        message.ID,
		"Content":   decryptedContent,
		"SenderID":  message.SenderID,
		"UserID":    message.UserID,
		"GroupID":   message.GroupID,
		"ChannelID": message.ChannelID,
		"Type":      message.Type,
		"Files":     message.Files,
		"Tags":      tags,
		"RoomID":    message.RoomID,
		"ChatID":    message.ChatID,
		"CreatedAt": message.CreatedAt,
	}

	// پخش پیام
	switch strings.ToLower(receiverType) {
	case "user":
		var receiverUser models.User
		if err := mc.db.Where("id = ?", receiverIDUint).First(&receiverUser).Error; err != nil {
			log.Printf("SendMessage: Receiver not found, ID: %d, error: %v", receiverIDUint, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "receiver not found"})
			return
		}
		mc.broadcaster.BroadcastToUser(receiverUser.ID, "new_message", response)
	case "group":
		var members []models.GroupMember
		mc.db.Where("group_id = ?", receiverIDUint).Find(&members)
		for _, member := range members {
			mc.broadcaster.BroadcastToUser(member.UserID, "new_message", response)
		}
	case "channel":
		var channel models.Channel
		mc.db.Where("id = ?", receiverIDUint).Preload("Members").First(&channel)
		for _, member := range channel.Members {
			mc.broadcaster.BroadcastToUser(member.ID, "new_message", response)
		}
	}

	c.JSON(http.StatusOK, response)
}

func (mc *MessageController) GetMessages(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	receiverType := c.Param("receiver_type")
	receiverIDStr := c.Param("receiver_id")

	if receiverIDStr == "" {
		log.Printf("GetMessages: Receiver ID is empty")
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver ID is required"})
		return
	}

	receiverID, err := strconv.ParseUint(receiverIDStr, 10, 32)
	if err != nil {
		log.Printf("GetMessages: Invalid receiver ID: %s, error: %v", receiverIDStr, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver ID"})
		return
	}

	var messages []models.Message
	query := mc.db.Where("sender_id = ? OR user_id = ?", user.ID, user.ID)
	switch strings.ToLower(receiverType) {
	case "user":
		query = query.Where("user_id = ? OR (user_id = ? AND sender_id = ?)", receiverID, user.ID, receiverID)
	case "group":
		query = query.Where("group_id = ?", receiverID)
	case "channel":
		query = query.Where("channel_id = ?", receiverID)
	default:
		log.Printf("GetMessages: Invalid receiver type: %s", receiverType)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver type"})
		return
	}

	if err := query.Find(&messages).Error; err != nil {
		log.Printf("GetMessages: Error fetching messages: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
		return
	}

	// رمزگشایی پیام‌ها
	for i, msg := range messages {
		decryptedContent, err := mc.aesCipher.Decrypt(msg.Content)
		if err != nil {
			log.Printf("GetMessages: Decryption error for message ID %d: %v", msg.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "decryption error"})
			return
		}
		messages[i].Content = decryptedContent
	}

	c.JSON(http.StatusOK, messages)
}

// UploadFileToS3 برای آپلود فایل به S3
func (mc *MessageController) UploadFileToS3(file *multipart.FileHeader) (string, error) {
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Printf("UploadFileToLocal: Error creating upload directory: %v", err)
		return "", err
	}

	fileContent, err := file.Open()
	if err != nil {
		log.Printf("UploadFileToLocal: Error opening file %s: %v", file.Filename, err)
		return "", err
	}
	defer fileContent.Close()

	// ایجاد نام فایل یکتا
	filename := fmt.Sprintf("%s-%s", uuid.New().String(), file.Filename)
	filePath := filepath.Join(uploadDir, filename)

	// ذخیره فایل
	out, err := os.Create(filePath)
	if err != nil {
		log.Printf("UploadFileToLocal: Error creating file %s: %v", filePath, err)
		return "", err
	}
	defer out.Close()

	if _, err := io.Copy(out, fileContent); err != nil {
		log.Printf("UploadFileToLocal: Error copying file %s: %v", filePath, err)
		return "", err
	}

	return filePath, nil
}

// FileType برای تعیین نوع فایل
func (mc *MessageController) FileType(fileName string, file io.Reader) models.FileType {
	buffer := make([]byte, 512)
	_, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		log.Printf("FileType: Error reading file %s: %v", fileName, err)
		return models.Default
	}
	mimeType := http.DetectContentType(buffer)
	switch mimeType {
	case "image/jpeg", "image/png":
		return models.Picture
	case "audio/mpeg", "audio/wav", "audio/webm":
		return models.Voice
	case "video/mp4":
		return models.Video
	default:
		return models.Default
	}
}

// GetWorkflows برای دریافت جریان‌های کاری
func (mc *MessageController) GetWorkflows(c *gin.Context) {
	var workflows []models.Workflow
	if err := mc.db.Find(&workflows).Error; err != nil {
		log.Printf("GetWorkflows: Error fetching workflows: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching workflows"})
		return
	}
	c.JSON(http.StatusOK, workflows)
}

// CreateConference برای ایجاد کنفرانس
func (mc *MessageController) CreateConference(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	var input struct {
		Title     string `json:"title"`
		StartTime string `json:"start_time"`
		UserIDs   []uint `json:"user_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("CreateConference: Invalid input: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}
	startTime, err := time.Parse(time.RFC3339, input.StartTime)
	if err != nil {
		log.Printf("CreateConference: Invalid start time: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start time"})
		return
	}

	// ایجاد roomID برای کنفرانس
	roomID := fmt.Sprintf("conference_%s", uuid.New().String())
	inviteLink := fmt.Sprintf("https://app.com/conference/%s", uuid.New().String())

	// ایجاد کنفرانس
	conference := models.Conference{
		Title:      input.Title,
		StartTime:  startTime,
		CreatorID:  user.ID,
		InviteLink: inviteLink,
		RoomID:     roomID,
	}
	if err := mc.db.Create(&conference).Error; err != nil {
		log.Printf("CreateConference: Failed to create conference: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create conference"})
		return
	}

	// افزودن اعضا
	var members []models.User
	mc.db.Where("id IN ?", input.UserIDs).Find(&members)
	mc.db.Model(&conference).Association("Members").Append(members)

	// پخش دعوت به اعضا
	for _, member := range members {
		mc.broadcaster.BroadcastToUser(member.ID, "conference_invite", gin.H{
			"conference_id": conference.ID,
			"invite_link":   inviteLink,
			"room_id":       roomID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"invite_link": inviteLink, "room_id": roomID})
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
