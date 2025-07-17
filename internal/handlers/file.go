package handlers

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	guuid "github.com/google/uuid"
	"gorm.io/gorm"
	"path/filepath"
	"v/pkg/models"
)

func UploadFile(db *gorm.DB) func(c *fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		file, err := c.FormFile("file")
		if err != nil {
			fmt.Println("خطا در دریافت فایل:", err)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":  "No file uploaded",
				"detail": err.Error(),
			})
		}

		fileBase := filepath.Base(file.Filename)
		fileExt := filepath.Ext(file.Filename)

		randomFileName := fmt.Sprintf("%s-%s", guuid.New().String(), fileBase)
		savePath := fmt.Sprintf("/uploads/%s", randomFileName)

		var fileType models.FileType
		switch fileExt {
		case ".png":
			fileType = models.FileTypeImage
		case ".jpg":
			fileType = models.FileTypeImage
		case ".jpeg":
			fileType = models.FileTypeImage
		case ".gif":
			fileType = models.FileTypeImage
		case ".mp4":
			fileType = models.FileTypeVideo
		case ".mov":
			fileType = models.FileTypeVideo
		case ".mp3":
			fileType = models.FileTypeAudio
		case ".wav":
			fileType = models.FileTypeAudio
		case ".webm":
			fileType = models.FileTypeAudio
		default:
			fileType = models.FileTypeFile
		}

		if err := c.SaveFile(file, "."+savePath); err != nil {
			fmt.Println("خطا در ذخیره فایل:", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":  "Failed to save file",
				"detail": err.Error(),
			})
		}

		fileModel := models.File{
			Name: file.Filename,
			Path: savePath,
			Type: fileType,
		}

		if err := db.Create(&fileModel).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":  "Failed to save file",
				"detail": err.Error(),
			})
		}

		fmt.Println("فایل ذخیره شد:", savePath)
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"id":       fileModel.ID,
			"file_url": savePath,
			"name":     file.Filename,
		})
	}
}
