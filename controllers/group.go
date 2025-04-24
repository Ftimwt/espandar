package controllers

import (
	"espandar/models"
	"net/http"
	"strconv"

	"fmt"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type GroupController struct {
	db *gorm.DB
}

func NewGroupController(db *gorm.DB) *GroupController {
	return &GroupController{db: db}
}

func (gc *GroupController) CreateGroup(c *gin.Context) {
	var group models.Group
	if err := c.ShouldBindJSON(&group); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	user, _ := c.MustGet("user").(*models.User)
	group.CreatorID = user.ID // تنظیم خالق گروه

	result := gc.db.Create(&group)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating group"})
		return
	}

	// افزودن خالق به اعضای گروه
	groupMember := models.GroupMember{
		GroupID: group.ID,
		UserID:  user.ID,
	}
	if err := gc.db.Create(&groupMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding creator to group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "group created successfully", "group": group})
}

func (gc *GroupController) CreateGroupWithMembers(c *gin.Context) {
	user, _ := c.MustGet("user").(*models.User)

	var input struct {
		Name    string `json:"name"`
		UserIDs []uint `json:"user_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	group := models.Group{
		Name:      input.Name,
		CreatorID: user.ID,
	}
	if err := gc.db.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating group"})
		return
	}

	// افزودن خالق به گروه
	groupMember := models.GroupMember{
		GroupID: group.ID,
		UserID:  user.ID,
	}
	if err := gc.db.Create(&groupMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding creator to group"})
		return
	}

	// افزودن کاربران انتخاب‌شده
	for _, userID := range input.UserIDs {
		member := models.GroupMember{
			GroupID: group.ID,
			UserID:  userID,
		}
		if err := gc.db.Create(&member).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("error adding user %d to group", userID)})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "group created successfully", "group": group})
}

func (gc *GroupController) AddMemberToGroup(c *gin.Context) {
	groupID := c.Param("group_id")
	userIDStr := c.Param("user_id")

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var group models.Group
	if err := gc.db.First(&group, groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	if userID != uint64(group.CreatorID) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "you do not have access to add member"})
		return
	}

	var user models.User
	user.ID = uint(userID)
	if err := gc.db.Model(&group).Association("Members").Append(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error adding member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member added successfully", "group": group})
}

func (gc *GroupController) RemoveMemberFromGroup(c *gin.Context) {
	groupID := c.Param("group_id")
	userIDStr := c.Param("user_id")

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var group models.Group
	if err := gc.db.First(&group, groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}
	if userID != uint64(group.CreatorID) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "you do not have access to remove member"})
		return
	}

	var user models.User
	user.ID = uint(userID)
	if err := gc.db.Model(&group).Association("Members").Delete(&user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error removing member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed successfully", "group": group})
}

func (gc *GroupController) GetGroups(c *gin.Context) {
	pageStr := c.Query("page")
	perPageStr := c.Query("perpage")

	if pageStr == "" || perPageStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page and perpage query parameters are required"})
		return
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page number"})
		return
	}

	perPage, err := strconv.Atoi(perPageStr)
	if err != nil || perPage <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid perpage number"})
		return
	}

	offset := (page - 1) * perPage

	var groups []models.Group
	if err := gc.db.Offset(offset).Limit(perPage).Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error retrieving groups"})
		return
	}

	var totalGroups int64
	gc.db.Model(&models.Group{}).Count(&totalGroups)

	c.JSON(http.StatusOK, gin.H{"page": page, "per_page": perPage, "total": totalGroups, "groups": groups})
}
func (gc *GroupController) GetGroup(c *gin.Context) {
	groupID := c.Param("id")
	var group models.Group
	if err := gc.db.Preload("Members").First(&group, groupID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "group not found"})
		return
	}
	c.JSON(http.StatusOK, group)
}

func (gc *GroupController) DeleteGroup(c *gin.Context) {
	groupID := c.Param("group_id")

	var group models.Group
	if err := gc.db.First(&group, groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	if err := gc.db.Delete(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error deleting group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "group deleted successfully"})
}
