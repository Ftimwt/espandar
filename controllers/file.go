package controllers

import (
	"espandar/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FileController struct {
	DB *gorm.DB
}

func NewFileController(db *gorm.DB) *FileController {
	return &FileController{DB: db}
}

func (fc *FileController) GetFiles(c *gin.Context) {
	var files []models.File
	if err := fc.DB.Find(&files).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch files"})
		return
	}

	response := make([]gin.H, len(files))
	for i, file := range files {
		response[i] = gin.H{
			"ID":   file.ID,
			"Name": file.FilePath, // یا هر فیلد مناسب برای نام فایل
		}
	}
	c.JSON(200, response)
}
