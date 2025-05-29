package controllers

import (
	"espandar/models"
	"net/http"
	"strconv"

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
	user, _ := c.MustGet("user").(*models.User)

	// بررسی نقش کاربر
	if user.Role != "user" && user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "only users and admins can create groups"})
		return
	}

	var input struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input", "details": err.Error()})
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

	c.JSON(http.StatusOK, gin.H{"message": "group created successfully", "group": group})
}

func (gc *GroupController) CreateGroupWithMembers(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	var input struct {
		Name    string `json:"name"`
		UserIDs []uint `json:"user_ids"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid input"})
		return
	}

	if input.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name cannot be empty"})
		return
	}

	group := models.Group{
		Name:      input.Name,
		CreatorID: user.ID,
	}

	input.UserIDs = append(input.UserIDs, user.ID)

	if err := gc.db.Create(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error creating group"})
		return
	}

	var members []models.User
	if err := gc.db.Where("id IN ?", input.UserIDs).Find(&members).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user IDs"})
		return
	}
	gc.db.Model(&group).Association("Members").Append(members)

	c.JSON(http.StatusOK, gin.H{"group": group})
}

func (gc *GroupController) AddGroupMember(c *gin.Context) {
	user := c.MustGet("user").(*models.User)
	groupID := c.Param("id")
	userID := c.Param("user_id")

	var group models.Group
	if err := gc.db.Where("id = ?", groupID).First(&group).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}
	if group.CreatorID != user.ID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "only creator can add members"})
		return
	}

	var member models.User
	if err := gc.db.Where("id = ?", userID).First(&member).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}
	gc.db.Model(&group).Association("Members").Append(&member)

	c.JSON(http.StatusOK, gin.H{"message": "member added"})
}

func (gc *GroupController) GetGroupMembers(c *gin.Context) {
	groupID := c.Param("group_id")

	var members []models.User
	if err := gc.db.Joins("JOIN group_members ON group_members.user_id = users.id").
		Where("group_members.group_id = ?", groupID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch members"})
		return
	}

	c.JSON(http.StatusOK, members)
}

func (gc *GroupController) RemoveMemberFromGroup(c *gin.Context) {
	groupID := c.Param("group_id")
	userIDStr := c.Param("user_id")
	user, _ := c.MustGet("user").(*models.User)

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

	// فقط خالق گروه می‌تواند عضو حذف کند
	if user.ID != group.CreatorID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "only the group creator can remove members"})
		return
	}

	if err := gc.db.Where("group_id = ? AND user_id = ?", groupID, userID).Delete(&models.GroupMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error removing member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "member removed successfully", "group": group})
}

func (gc *GroupController) LeaveGroup(c *gin.Context) {
	groupID := c.Param("group_id")
	user, _ := c.MustGet("user").(*models.User)

	var group models.Group
	if err := gc.db.First(&group, groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	// خالق گروه نمی‌تواند خارج شود
	if user.ID == group.CreatorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "group creator cannot leave the group"})
		return
	}

	// بررسی اینکه کاربر عضو گروه باشد
	var count int64
	if err := gc.db.Where("group_id = ? AND user_id = ?", groupID, user.ID).Count(&count).Error; err != nil || count == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "you are not a member of this group"})
		return
	}

	if err := gc.db.Where("group_id = ? AND user_id = ?", groupID, user.ID).Delete(&models.GroupMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error leaving group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "you have left the group successfully"})
}

func (gc *GroupController) GetGroups(c *gin.Context) {
	currentUser := c.MustGet("user").(*models.User)
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
	if err := gc.db.Joins("JOIN group_members ON group_members.group_id = groups.id").Where("group_members.user_id = ?", currentUser.ID).Offset(offset).Limit(perPage).Find(&groups).Error; err != nil {
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
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}
	c.JSON(http.StatusOK, group)
}

func (gc *GroupController) DeleteGroup(c *gin.Context) {
	groupID := c.Param("group_id")
	user, _ := c.MustGet("user").(*models.User)

	var group models.Group
	if err := gc.db.First(&group, groupID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "group not found"})
		return
	}

	// فقط خالق گروه می‌تواند آن را حذف کند
	if user.ID != group.CreatorID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "only the group creator can delete the group"})
		return
	}

	if err := gc.db.Delete(&group).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "error deleting group"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "group deleted successfully"})
}
