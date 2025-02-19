package controllers

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"espandar/dto"
	"espandar/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

var encryptionkey = []byte("this_is_a_32_byte_long_key_1234!")

func pad(src []byte) []byte {
	padding := aes.BlockSize - len(src)%aes.BlockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(src, padtext...)
}

func unpad(src []byte) ([]byte, error) {
	length := len(src)
	unpadding := int(src[length-1])
	if unpadding > length {
		return nil, fmt.Errorf("invalid padding")
	}
	return src[:length-unpadding], nil
}

func encrypt(plainText []byte) (string, error) {
	block, err := aes.NewCipher(encryptionkey)
	if err != nil {
		return "", err
	}

	plainTextBytes := pad(plainText)
	cipherText := make([]byte, aes.BlockSize+len(plainTextBytes))
	iv := cipherText[:aes.BlockSize]

	if _, err := rand.Read(iv); err != nil {
		return "", err
	}

	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(cipherText[aes.BlockSize:], plainTextBytes)

	return base64.StdEncoding.EncodeToString(cipherText), nil
}

func decrypt(cipherText string) (string, error) {
	block, err := aes.NewCipher(encryptionkey)
	if err != nil {
		return "", err
	}

	cipherTextBytes, err := base64.StdEncoding.DecodeString(cipherText)
	if err != nil {
		return "", err
	}

	if len(cipherTextBytes) < aes.BlockSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	iv := cipherTextBytes[:aes.BlockSize]
	cipherTextBytes = cipherTextBytes[aes.BlockSize:]

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(cipherTextBytes, cipherTextBytes)

	plainText, err := unpad(cipherTextBytes)
	if err != nil {
		return "", err
	}
	return string(plainText), nil
}

func SendMessage(c *gin.Context) {
	var formData dto.Message

	if err := c.ShouldBind(&formData); err != nil {
		log.Println("error binding from data:", err)
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

	if len(formContent.Value["content"]) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	content := formContent.Value["content"][0]

	encryptedContent, err := encrypt(content)
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

	message := models.Message{
		Content:    encryptedContent,
		SenderID:   c.MustGet("user").(*models.User).ID,
		IsReceived: false,
		Seen:       false,
	}

	switch receiverType {
	case "user":
		message.UserID = uint(receiverIDUint)
	case "group":
		message.GroupID = uint(receiverIDUint)
	case "channel":
		message.ChannelID = uint(receiverIDUint)
	default:
		log.Println("receiver type does not exists:", receiverType)
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exists"})
		return
	}

	if err := db.Create(&message).Error; err != nil {
		log.Println("error sending message:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "message not send"})
		return
	}

	files := formContent.File["files"]
	if len(files) > 0 {
		for _, fileHeader := range files {
			filePath := "./uploads/" + fileHeader.Filename

			if err := c.SaveUploadedFile(fileHeader, filePath); err != nil {
				log.Println("error saving file:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "file dosent save"})
				return
			}

			newFile := models.File{
				FilePath: filePath,
				Type:     FileType(fileHeader.Filename),
			}

			if err := db.Create(&newFile).Error; err != nil {
				log.Println("unable to save file:", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "unable to save file"})
				return
			}

			message.Files = append(message.Files, newFile)
		}
	}

	if err := db.Model(&message).Updates(models.Message{Files: message.Files}).Error; err != nil {
		log.Println("error updating message information:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error updating message information"})
		return
	}

	log.Println("message sent successfully:", message.ID)
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
		if err := db.Where("(user_id = ? AND sender_id = ?) OR (user_id = ? AND sender_id = ?) AND id > ?", userID, receiverID, receiverID, userID, lastMessageID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "group":
		if err := db.Where("group_id = ? AND id > ?", receiverID, lastMessageID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	case "channel":
		if err := db.Where("channel_id = ? AND id > ?", receiverID, lastMessageID).Find(&messages).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error fetching messages"})
			return
		}
	default:
		c.JSON(http.StatusNotFound, gin.H{"error": "receiver type does not exists"})
		return
	}

	for i := range messages {
		if messages[i].UserID == userID {
			messages[i].IsReceived = true
			messages[i].Seen = true
		} else {
			messages[i].IsReceived = false
			messages[i].Seen = false
		}

		decryptedContent, err := decrypt(messages[i].Content)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error decrypting message"})
			return
		}
		messages[i].Content = decryptedContent
	}

	for _, message := range messages {
		if err := db.Model(&message).Updates(models.Message{IsReceived: message.IsReceived, Seen: message.Seen}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "error updating message status"})
			return
		}
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

	if err := db.Model(&updatedMessage).Where("id=? AND user_id=?", messageID, userID).Updates(models.Message{Content: updatedMessage.Content, Seen: updatedMessage.Seen, IsReceived: updatedMessage.IsReceived}).Error; err != nil {
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
