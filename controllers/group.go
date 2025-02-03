package controllers

import (
	"Spandar/models"
	"github.com/gin-gonic/gin"
	"net/http"
)

func CreateGroup(c *gin.Context) {
	var group models.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	result := db.Create(&group)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "group create successfully", "group": group})
}
