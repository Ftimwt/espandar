package controllers

import (
	"net/http"
	"sort"
	"strconv"

	"espandar/models"
	"espandar/webrtc"
	"espandar/websocket"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CallController ساختار کنترلر تماس‌ها
type CallController struct {
	DB          *gorm.DB
	Broadcaster *websocket.SocketBroadcaster
}

// StartCallRequest ساختار درخواست شروع تماس
type StartCallRequest struct {
	OtherUserID  uint   `json:"otherUserID" binding:"required"`
	CallType     string `json:"callType" binding:"required,oneof=video voice"`
	ReceiverType string `json:"receiverType" binding:"required,oneof=user group channel"`
}

// NewCallController ایجاد یک نمونه جدید از CallController
func NewCallController(db *gorm.DB, broadcaster *websocket.SocketBroadcaster) *CallController {
	return &CallController{
		DB:          db,
		Broadcaster: broadcaster,
	}
}

// JoinCallRequest ساختار درخواست پیوستن به تماس
type JoinCallRequest struct {
	RoomID   string `json:"roomID" binding:"required"`
	CallType string `json:"callType" binding:"required,oneof=video voice"`
}

// createRoomID ایجاد RoomID بر اساس userID و receiverID
func createRoomID(userID, otherUserID uint) string {
	ids := []uint{userID, otherUserID}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	return "room_" + strconv.FormatUint(uint64(ids[0]), 10) + "_" + strconv.FormatUint(uint64(ids[1]), 10)
}

// HandleStartCall مدیریت درخواست شروع تماس
func (c *CallController) HandleStartCall(ctx *gin.Context) {
	user, exists := ctx.Get("user")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "کاربر احراز هویت نشده است"})
		return
	}
	userModel, ok := user.(*models.User)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "نوع کاربر نامعتبر است"})
		return
	}

	var req StartCallRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "درخواست نامعتبر: " + err.Error()})
		return
	}

	roomID := ""
	switch req.ReceiverType {
	case "user":
		roomID = createRoomID(userModel.ID, req.OtherUserID)
		c.Broadcaster.BroadcastToUser(req.OtherUserID, "call_incoming", map[string]interface{}{
			"roomID":   roomID,
			"callType": req.CallType,
			"from":     userModel.ID,
		})

	case "group":
		roomID = "group_" + strconv.Itoa(int(req.OtherUserID))
		var members []models.GroupMember
		if err := c.DB.Where("group_id = ?", req.OtherUserID).Find(&members).Error; err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "اعضای گروه یافت نشدند"})
			return
		}
		for _, m := range members {
			c.Broadcaster.BroadcastToUser(m.UserID, "call_incoming", map[string]interface{}{
				"roomID":   roomID,
				"callType": req.CallType,
				"from":     userModel.ID,
			})
		}

	case "channel":
		roomID = "channel_" + strconv.Itoa(int(req.OtherUserID))
		var channel models.Channel
		if err := c.DB.Preload("Members").First(&channel, req.OtherUserID).Error; err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "اعضای کانال یافت نشدند"})
			return
		}
		for _, m := range channel.Members {
			c.Broadcaster.BroadcastToUser(m.ID, "call_incoming", map[string]interface{}{
				"roomID":   roomID,
				"callType": req.CallType,
				"from":     userModel.ID,
			})
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"roomID":   roomID,
		"callType": req.CallType,
	})
}

// HandleJoinCall مدیریت درخواست پیوستن به تماس
func (c *CallController) HandleJoinCall(ctx *gin.Context) {
	user, exists := ctx.Get("user")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "کاربر احراز هویت نشده است"})
		return
	}
	if _, ok := user.(*models.User); !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "نوع کاربر نامعتبر است"})
		return
	}

	var req JoinCallRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "درخواست نامعتبر: " + err.Error()})
		return
	}

	// بررسی وجود اتاق
	if _, exists := webrtc.Rooms[req.RoomID]; !exists {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "اتاق یافت نشد"})
		return
	}

	// پاسخ به کلاینت
	ctx.JSON(http.StatusOK, gin.H{
		"roomID":   req.RoomID,
		"callType": req.CallType,
	})
}
