package controllers

import (
	"encoding/json"
	"espandar/encryption"
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

	// بررسی receiver_id
	if receiverID == "" {
		log.Printf("SendMessage: Receiver ID is empty for user %d", user.ID)
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
		log.Printf("SendMessage: Invalid form data for user %d: %v", user.ID, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid form data"})
		return
	}

	// خواندن message_id
	var messageID string
	if messageIDValues, ok := formContent.Value["message_id"]; ok && len(messageIDValues) > 0 {
		messageID = messageIDValues[0]
		// بررسی پیام تکراری
		var existingMsg models.Message
		if err := mc.db.Where("message_id = ?", messageID).First(&existingMsg).Error; err == nil {
			log.Printf("SendMessage: Duplicate message detected with message_id %s for user %d", messageID, user.ID)
			c.JSON(http.StatusConflict, gin.H{"error": "message already exists"})
			return
		} else if err != gorm.ErrRecordNotFound {
			log.Printf("SendMessage: Error checking duplicate message_id %s: %v", messageID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error checking message existence"})
			return
		}
	} else {
		messageID = uuid.New().String()
		log.Printf("SendMessage: Generated new message_id %s for user %d", messageID, user.ID)
	}

	// پردازش محتوا
	var content string
	if contentValues, ok := formContent.Value["content"]; ok && len(contentValues) > 0 {
		content = contentValues[0]
	} else {
		content = "فایل ارسالی"
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
			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			switch {
			case strings.HasPrefix(contentType, "image/"):
				messageType = "picture"
			case strings.HasPrefix(contentType, "audio/") || ext == ".webm" || ext == ".mp3" || ext == ".wav":
				messageType = "voice"
			case strings.HasPrefix(contentType, "video/") && ext != ".webm":
				messageType = "video"
			}
		}
	}

	// رمزنگاری محتوا
	var encryptedContent string
	if content != "" {
		encryptedContent, err = mc.aesCipher.Encrypt(content)
		if err != nil {
			log.Printf("SendMessage: Encryption error for user %d: %v", user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "encryption error"})
			return
		}
	}

	// پردازش تگ‌ها
	var tagsJSON string
	var tags []models.Tag
	if tagValues, ok := formContent.Value["tags"]; ok && len(tagValues) > 0 {
		tagsJSON = tagValues[0]
		if tagsJSON != "" {
			if err := json.Unmarshal([]byte(tagsJSON), &tags); err != nil {
				log.Printf("SendMessage: Invalid tags format for user %d: %v", user.ID, err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tags format"})
				return
			}
			for _, tag := range tags {
				switch tag.Type {
				case "user":
					var user models.User
					if err := mc.db.Where("id = ?", tag.ID).First(&user).Error; err != nil {
						log.Printf("SendMessage: Invalid user ID %d for tag: %v", tag.ID, err)
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid user ID: %d", tag.ID)})
						return
					}
				case "file":
					var file models.File
					if err := mc.db.Where("id = ?", tag.ID).First(&file).Error; err != nil {
						log.Printf("SendMessage: Invalid file ID %d for tag: %v", tag.ID, err)
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid file ID: %d", tag.ID)})
						return
					}
				case "workflow":
					var workflow models.Workflow
					if err := mc.db.Where("id = ?", tag.ID).First(&workflow).Error; err != nil {
						log.Printf("SendMessage: Invalid workflow ID %d for tag: %v", tag.ID, err)
						c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid workflow ID: %d", tag.ID)})
						return
					}
				default:
					log.Printf("SendMessage: Invalid tag type %s for user %d", tag.Type, user.ID)
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
				log.Printf("SendMessage: Error creating chat for user %d and receiver %d: %v", user.ID, receiverIDUint, err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating chat"})
				return
			}
		} else {
			log.Printf("SendMessage: Error finding chat for user %d and receiver %d: %v", user.ID, receiverIDUint, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error finding chat"})
			return
		}
	}

	// تنظیم RoomID
	if roomID == "" {
		roomID = fmt.Sprintf("room_%d_%d", min(user.ID, receiverIDUint), max(user.ID, receiverIDUint))
		log.Printf("SendMessage: Generated roomID %s for user %d and receiver %d", roomID, user.ID, receiverIDUint)
	}

	// ایجاد پیام
	message := models.Message{
		Content:   encryptedContent,
		SenderID:  user.ID,
		Type:      messageType,
		Tags:      tagsJSON,
		RoomID:    &roomID,
		ChatID:    chat.ID,
		MessageID: messageID,
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
		log.Printf("SendMessage: Invalid receiver type %s for user %d", receiverType, user.ID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver type"})
		return
	} // آپلود فایل‌ها به سرور
	files := formContent.File["files"]
	log.Printf("SendMessage: received %d files", len(files))
	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			log.Printf("SendMessage: Error reading file %s for user %d: %v", fileHeader.Filename, user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error reading file %s: %v", fileHeader.Filename, err)})
			return
		}
		defer file.Close()

		filePath, err := mc.UploadFileToLocal(fileHeader)
		if err != nil {
			log.Printf("SendMessage: Error uploading file %s for user %d: %v", fileHeader.Filename, user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error uploading file %s: %v", fileHeader.Filename, err)})
			return
		}
		newFile := models.File{
			FilePath:  filePath,
			Type:      mc.FileType(fileHeader.Filename, file),
			MessageID: 0, // MessageID بعداً تنظیم می‌شود
		}
		message.Files = append(message.Files, newFile)
	}

	// ذخیره پیام در دیتابیس
	if err := mc.db.Create(&message).Error; err != nil {
		log.Printf("SendMessage: Error saving message for user %d, message_id %s: %v", user.ID, messageID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error saving message: %v", err)})
		return
	}

	// ذخیره فایل‌ها در دیتابیس
	for i := range message.Files {
		message.Files[i].MessageID = message.ID
		message.Files[i].ID = 0 // اطمینان از تولید خودکار ID
		if err := mc.db.Create(&message.Files[i]).Error; err != nil {
			log.Printf("SendMessage: Error saving file for message %d: %v", message.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error saving file: %v", err)})
			return
		}
	}

	// رمزگشایی محتوا برای پاسخ
	decryptedContent := content
	if encryptedContent != "" {
		decryptedContent, err = mc.aesCipher.Decrypt(encryptedContent)
		if err != nil {
			log.Printf("SendMessage: Decryption error for message %d: %v", message.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "decryption error"})
			return
		}
	}

	// آماده‌سازی پاسخ
	log.Printf("SendMessage: Successfully sent message with ID=%d, MessageID=%s, Seen=%v, IsReceived=%v for user %d",
		message.ID, message.MessageID, message.Seen, message.IsReceived, user.ID)
	response := gin.H{
		"ID":          message.ID,
		"Content":     decryptedContent,
		"SenderID":    message.SenderID,
		"UserID":      message.UserID,
		"GroupID":     message.GroupID,
		"ChannelID":   message.ChannelID,
		"Type":        message.Type,
		"Files":       message.Files,
		"Tags":        tags,
		"RoomID":      message.RoomID,
		"ChatID":      message.ChatID,
		"CreatedAt":   message.CreatedAt,
		"seen":        message.Seen,
		"is_received": message.IsReceived,
		"message_id":  message.MessageID,
	}

	// پخش پیام از طریق WebSocket
	switch strings.ToLower(receiverType) {
	case "user":
		var receiverUser models.User
		if err := mc.db.Where("id = ?", receiverIDUint).First(&receiverUser).Error; err != nil {
			log.Printf("SendMessage: Receiver not found, ID: %d, error: %v", receiverIDUint, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "receiver not found"})
			return
		}
		log.Printf("SendMessage: Broadcasting to receiver %d for message %d", receiverUser.ID, message.ID)
		mc.broadcaster.BroadcastToUser(receiverUser.ID, "new_message", response)
	case "group":
		var members []models.GroupMember
		mc.db.Where("group_id = ?", receiverIDUint).Find(&members)
		for _, member := range members {
			log.Printf("SendMessage: Broadcasting to group member %d for message %d", member.UserID, message.ID)
			mc.broadcaster.BroadcastToUser(member.UserID, "new_message", response)
		}
		log.Printf("SendMessage: Broadcasting to sender %d for message %d", user.ID, message.ID)
		mc.broadcaster.BroadcastToUser(user.ID, "new_message", response)
	case "channel":
		var channel models.Channel
		mc.db.Where("id = ?", receiverIDUint).Preload("Members").First(&channel)
		for _, member := range channel.Members {
			log.Printf("SendMessage: Broadcasting to channel member %d for message %d", member.ID, message.ID)
			mc.broadcaster.BroadcastToUser(member.ID, "new_message", response)
		}
		log.Printf("SendMessage: Broadcasting to sender %d for message %d", user.ID, message.ID)
	}

	c.JSON(http.StatusOK, response)
}

// تابع کمکی برای محاسبه حداقل و حداکثر
func min(a, b uint) uint {
	if a < b {
		return a
	}
	return b
}

func max(a, b uint) uint {
	if a > b {
		return a
	}
	return b
}

func (mc *MessageController) UpdateMessage(c *gin.Context) {
	userID := c.MustGet("user").(*models.User).ID
	messageID := c.Param("message_id")

	var input struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("UpdateMessage: Invalid input, error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	var message models.Message
	if err := mc.db.Where("message_id = ? AND sender_id = ?", messageID, userID).First(&message).Error; err != nil {
		log.Printf("UpdateMessage: Message not found, ID: %s, userID: %d, error: %v", messageID, userID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found or unauthorized"})
		return
	}

	message.Content = input.Content
	if err := mc.db.Save(&message).Error; err != nil {
		log.Printf("UpdateMessage: Error updating message, ID: %s, error: %v", messageID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not updated"})
		return
	}

	// اطلاع‌رسانی به گیرنده یا اتاق
	if message.UserID != nil {
		mc.broadcaster.BroadcastToUser(*message.UserID, "message_updated", gin.H{
			"message_id": message.ID,
			"content":    message.Content,
		})
	} else if message.GroupID != nil || message.ChannelID != nil {
		if message.RoomID != nil && *message.RoomID != "" {
			// فرض می‌کنیم آرگومان چهارم userID است
			mc.broadcaster.BroadcastToRoom(*message.RoomID, "message_updated", gin.H{
				"message_id": message.ID,
				"content":    message.Content,
			}, userID)
		} else {
			log.Printf("UpdateMessage: RoomID is nil or empty for message ID: %s", messageID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "message updated",
		"message_id": message.ID,
		"content":    message.Content,
	})
}
func (mc *MessageController) DeleteMessage(c *gin.Context) {
	userID := c.MustGet("user").(*models.User).ID
	messageID := c.Param("message_id")

	var message models.Message
	if err := mc.db.Where("message_id = ? AND sender_id = ?", messageID, userID).First(&message).Error; err != nil {
		log.Printf("DeleteMessage: Message not found, ID: %s, userID: %d, error: %v", messageID, userID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found or unauthorized"})
		return
	}

	if err := mc.db.Delete(&message).Error; err != nil {
		log.Printf("DeleteMessage: Error deleting message, ID: %s, error: %v", messageID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not deleted"})
		return
	}

	// اطلاع‌رسانی به گیرنده یا اتاق
	if message.UserID != nil {
		mc.broadcaster.BroadcastToUser(*message.UserID, "message_deleted", gin.H{
			"message_id": message.ID,
		})
	} else if message.GroupID != nil || message.ChannelID != nil {
		if message.RoomID != nil && *message.RoomID != "" {
			// فرض می‌کنیم آرگومان چهارم userID است
			mc.broadcaster.BroadcastToRoom(*message.RoomID, "message_deleted", gin.H{
				"message_id": message.ID,
			}, userID)
		} else {
			log.Printf("DeleteMessage: RoomID is nil or empty for message ID: %s", messageID)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "message deleted",
		"message_id": message.ID,
	})
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
	query := mc.db.Preload("Files")
	switch strings.ToLower(receiverType) {
	case "user":
		var chat models.Chat
		if err := mc.db.Where(
			"(user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)",
			user.ID, receiverID, receiverID, user.ID,
		).First(&chat).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				chat = models.Chat{UserID1: user.ID, UserID2: uint(receiverID)}
				if err := mc.db.Create(&chat).Error; err != nil {
					log.Printf("Error creating chat: %v", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot create chat"})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "error finding chat"})
				return
			}
		}
		query = query.Where("chat_id = ?", chat.ID)
	case "group":
		query = query.Where("group_id = ?", receiverID)
	case "channel":
		query = query.Where("channel_id = ?", receiverID)
	default:
		log.Printf("GetMessages: Invalid receiver type: %s", receiverType)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid receiver type"})
		return
	}

	if err := query.Order("created_at ASC").Find(&messages).Error; err != nil {
		log.Printf("GetMessages: Error fetching messages: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
		return
	}

	response := make([]gin.H, 0, len(messages))
	for _, msg := range messages {
		decryptedContent := ""
		if msg.Content != "" {
			log.Printf("GetMessages: Attempting to decrypt message ID %d, content: %s", msg.ID, msg.Content)
			decryptedContent, err = mc.aesCipher.Decrypt(msg.Content)
			if err != nil {
				log.Printf("GetMessages: Decryption error for message ID %d, content: %s, error: %v", msg.ID, msg.Content, err)
				continue // پیام را نادیده بگیر
			}
			log.Printf("GetMessages: Decrypted content for message ID %d: %s", msg.ID, decryptedContent)
		}
		var tags []models.Tag
		if msg.Tags != "" {
			if err := json.Unmarshal([]byte(msg.Tags), &tags); err != nil {
				log.Printf("GetMessages: Error parsing tags for message ID %d: %v", msg.ID, err)
			}
		}
		var sender models.User
		if err := mc.db.First(&sender, msg.SenderID).Error; err == nil {
			response = append(response, gin.H{
				"ID":                 msg.ID,
				"Content":            decryptedContent,
				"SenderID":           msg.SenderID,
				"UserID":             msg.UserID,
				"GroupID":            msg.GroupID,
				"ChannelID":          msg.ChannelID,
				"Type":               msg.Type,
				"Files":              msg.Files,
				"Tags":               tags,
				"RoomID":             msg.RoomID,
				"ChatID":             msg.ChatID,
				"CreatedAt":          msg.CreatedAt,
				"seen":               msg.Seen,
				"is_received":        msg.IsReceived,
				"SenderUsername":     sender.Username,
				"SenderProfileImage": sender.ProfileImage,
			})
		}
	}

	log.Printf("GetMessages: Returning %d messages for user %d and receiver %d", len(response), user.ID, receiverID)
	c.JSON(http.StatusOK, response)
}

func (mc *MessageController) MarkMessageAsSeen(c *gin.Context) {
	messageID := c.Param("message_id")
	user := c.MustGet("user").(*models.User)

	var message models.Message
	if err := mc.db.Where("id = ?", messageID).First(&message).Error; err != nil {
		log.Printf("MarkMessageAsSeen: Message not found, ID: %s, error: %v", messageID, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}

	// فقط گیرنده می‌تونه پیام رو سین کنه
	if message.UserID == nil || *message.UserID != user.ID {
		log.Printf("MarkMessageAsSeen: Unauthorized user %d for message %s", user.ID, messageID)
		c.JSON(http.StatusForbidden, gin.H{"error": "unauthorized"})
		return
	}

	message.IsReceived = true
	message.Seen = true
	if err := mc.db.Save(&message).Error; err != nil {
		log.Printf("MarkMessageAsSeen: Error updating message, ID: %s, error: %v", messageID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error updating message"})
		return
	}

	// اطلاع‌رسانی به فرستنده
	log.Printf("Broadcasting message_seen to user %d for message %s", message.SenderID, message.ID)
	mc.broadcaster.BroadcastToUser(message.SenderID, "message_seen", gin.H{
		"message_id":  message.MessageID,
		"seen":        true,
		"is_received": true,
	})

	c.JSON(http.StatusOK, gin.H{
		"status":      "message marked as seen",
		"message_id":  message.ID,
		"seen":        message.Seen,
		"is_received": message.IsReceived,
	})
}

// UploadFileToLocal برای ذخیره فایل روی سرور
func (mc *MessageController) UploadFileToLocal(file *multipart.FileHeader) (string, error) {
	uploadDir := "./Uploads"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Printf("UploadFileToLocal: Error creating upload directory %s: %v", uploadDir, err)
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	fileContent, err := file.Open()
	if err != nil {
		log.Printf("UploadFileToLocal: Error opening file %s: %v", file.Filename, err)
		return "", fmt.Errorf("failed to open file %s: %w", file.Filename, err)
	}
	defer fileContent.Close()

	// ایجاد نام فایل یکتا
	filename := fmt.Sprintf("%s-%s", uuid.New().String(), file.Filename)
	filePath := filepath.Join(uploadDir, filename)

	// ذخیره فایل
	out, err := os.Create(filePath)
	if err != nil {
		log.Printf("UploadFileToLocal: Error creating file %s: %v", filePath, err)
		return "", fmt.Errorf("failed to create file %s: %w", filePath, err)
	}
	defer out.Close()

	if _, err := io.Copy(out, fileContent); err != nil {
		log.Printf("UploadFileToLocal: Error copying file %s: %v", filePath, err)
		return "", fmt.Errorf("failed to copy file %s: %w", filePath, err)
	}

	// برگرداندن مسیر قابل دسترسی برای کلاینت
	return fmt.Sprintf("/Uploads/%s", filename), nil
}

// FileType برای تعیین نوع فایل
func (mc *MessageController) FileType(fileName string, file io.Reader) models.FileType {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		log.Printf("FileType: Error reading file %s: %v", fileName, err)
		return models.Default
	}
	mimeType := http.DetectContentType(buffer[:n])
	// بررسی پسوند فایل برای دقت بیشتر
	ext := strings.ToLower(filepath.Ext(fileName))
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return models.Picture
	case strings.HasPrefix(mimeType, "audio/") || ext == ".webm" || ext == ".mp3" || ext == ".wav":
		return models.Voice
	case strings.HasPrefix(mimeType, "video/") && ext != ".webm":
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

	uid := uuid.New().String()
	roomID := fmt.Sprintf("conference_%s", uid)
	inviteLink := fmt.Sprintf("https://app.com/conference/%s", uid)

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

	var members []models.User
	mc.db.Where("id IN ?", input.UserIDs).Find(&members)
	if len(members) == 0 {
		log.Println("CreateConference: No valid members found")
	}
	mc.db.Model(&conference).Association("Members").Append(members)

	for _, member := range members {
		mc.broadcaster.BroadcastToUser(member.ID, "conference_invite", gin.H{
			"conference_id": conference.ID,
			"title":         conference.Title,
			"start_time":    conference.StartTime,
			"invite_link":   inviteLink,
			"room_id":       roomID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"invite_link": inviteLink, "room_id": roomID})
}
