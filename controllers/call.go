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

// NewCallController ایجاد یک نمونه جدید از CallController
func NewCallController(db *gorm.DB, broadcaster *websocket.SocketBroadcaster) *CallController {
	return &CallController{
		DB:          db,
		Broadcaster: broadcaster,
	}
}

// StartCallRequest ساختار درخواست شروع تماس
type StartCallRequest struct {
	OtherUserID uint   `json:"otherUserID" binding:"required"`
	CallType    string `json:"callType" binding:"required,oneof=video voice"`
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

	// بررسی وجود کاربر مقصد
	var otherUser models.User
	if err := c.DB.First(&otherUser, req.OtherUserID).Error; err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "کاربر مقصد یافت نشد"})
		return
	}

	// ایجاد RoomID
	roomID := createRoomID(userModel.ID, req.OtherUserID)

	// ایجاد یا استفاده از اتاق WebRTC
	if _, exists := webrtc.Rooms[roomID]; !exists {
		webrtc.Rooms[roomID] = webrtc.NewRoom()
	}

	// اطلاع‌رسانی تماس ورودی به گیرنده
	c.Broadcaster.BroadcastToUser(req.OtherUserID, "call_incoming", map[string]interface{}{
		"roomID":   roomID,
		"callType": req.CallType,
		"from":     userModel.ID,
	})

	// پاسخ به کلاینت
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
