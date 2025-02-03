package controllers

import (
	"net/http"
	"github.com/gin-gonic/gin"
    "Spandar/models"
)

func CreateChannel(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var channel models.Channel

	if err := c.ShouldBindJSON(&channel); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	channel.CreatorID = userID

	if err := db.Create(&channel).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating channel"})
		return
	}

    c.JSON(http.StatusOK, gin.H{"message": "channel create successfully", "channel": channel})
}