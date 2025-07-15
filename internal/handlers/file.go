package handlers

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
)

func UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		fmt.Println("خطا در دریافت فایل:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":  "No file uploaded",
			"detail": err.Error(),
		})
	}

	savePath := fmt.Sprintf("./uploads/%s", file.Filename)
	if err := c.SaveFile(file, savePath); err != nil {
		fmt.Println("خطا در ذخیره فایل:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  "Failed to save file",
			"detail": err.Error(),
		})
	}

	fmt.Println("فایل ذخیره شد:", savePath)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"file_url": "/uploads/" + file.Filename,
		"name":     file.Filename,
	})
}
