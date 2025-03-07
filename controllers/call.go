package controllers

import (
	"espandar/database"
	"espandar/jwt"
	"espandar/models"
	"espandar/websocket"
	"github.com/gin-gonic/gin"
	"net/http"
)

func StartCall(c *gin.Context) {
	token := c.GetHeader("Authorization")
	callerID, err := jwt.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		ReceiverID uint   `json:"receiver_id" binding:"required"`
		CallType   string `json:"call_type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver id and call type are required"})
		return
	}

	call := models.Call{
		CallerID:   callerID,
		ReceiverID: requestBody.ReceiverID,
		Status:     "initiated",
		CallType:   requestBody.CallType,
	}

	db := database.Database()
	if err := db.Create(&call).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create call"})
		return
	}

	callInfo := gin.H{
		"caller_id":   call.CallerID,
		"receiver_id": call.ReceiverID,
		"call_type":   call.CallType,
		"status":      call.Status,
	}
	websocket.BroadcastToUser(call.ReceiverID, "call_initiated", callInfo)

	c.JSON(http.StatusOK, gin.H{"message": "call started", "call": callInfo})
}

func AnswerCall(c *gin.Context) {
	token := c.GetHeader("Authorization")
	receiverID, err := jwt.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		CallID uint   `json:"call_id" binding:"required"`
		Answer string `json:"answer" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "call id and answer are required"})
		return
	}

	var call models.Call

	db := database.Database()
	if err := db.First(&call, requestBody.CallID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "call not found"})
		return
	}

	call.Status = "ongoing"
	call.Answer = requestBody.Answer

	if err := db.Save(&call).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update call"})
		return
	}

	answerInfo := gin.H{
		"receiver_id": receiverID,
		"answer":      call.Answer,
	}
	websocket.BroadcastToUser(call.CallerID, "call_answered", answerInfo)

	c.JSON(http.StatusOK, gin.H{"message": "call answered", "call": call})
}

func EndCall(c *gin.Context) {
	token := c.GetHeader("Authorization")
	userID, err := jwt.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		CallID uint `json:"call_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "call id is required"})
		return
	}

	var call models.Call

	db := database.Database()
	if err := db.First(&call, requestBody.CallID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "call not found"})
		return
	}

	call.Status = "ended"

	if err := db.Save(&call).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not end call"})
		return
	}

	endInfo := gin.H{
		"call_id":  call.ID,
		"status":   call.Status,
		"ended_by": userID,
	}
	websocket.BroadcastToUser(call.CallerID, "call_ended", endInfo)
	websocket.BroadcastToUser(call.ReceiverID, "call_ended", endInfo)

	c.JSON(http.StatusOK, gin.H{"message": "call ended", "call": endInfo})
}

func SendOffer(c *gin.Context) {
	token := c.GetHeader("Authorization")
	callerID, err := jwt.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		ReceiverID uint   `json:"receiver_id" binding:"required"`
		Offer      string `json:"offer" binding:"required"`
		CallType   string `json:"call_type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver id , offer and call type are required"})
		return
	}

	offerMessage := models.OfferMessage{
		ReceiverID: requestBody.ReceiverID,
		Offer:      requestBody.Offer,
		CallType:   requestBody.CallType,
	}
	db := database.Database()
	if err := db.Create(&offerMessage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save offer"})
		return
	}

	offerInfo := gin.H{
		"caller_id": callerID,
		"offer":     offerMessage.Offer,
		"call_type": offerMessage.CallType,
	}
	websocket.BroadcastToUser(requestBody.ReceiverID, "offer_received", offerInfo)

	c.JSON(http.StatusOK, gin.H{"message": "offer sent", "offer": offerInfo})
}

func SendAnswer(c *gin.Context) {
	token := c.GetHeader("Authorization")
	receiverID, err := jwt.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		OfferID string `json:"offer_id" binding:"required"`
		Answer  string `json:"answer" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "offer id and answer are required"})
		return
	}

	answerMessage := models.AnswerMessage{
		ReceiverID: receiverID,
		Answer:     requestBody.Answer,
	}
	db := database.Database()
	if err := db.Create(&answerMessage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save answer"})
		return
	}

	var callerID uint

	answerInfo := gin.H{
		"receiver_id": receiverID,
		"answer":      answerMessage.Answer,
		"offer_id":    requestBody.OfferID,
	}
	websocket.BroadcastToUser(callerID, "answer_received", answerInfo)

	c.JSON(http.StatusOK, gin.H{"message": "answer sent", "answer": answerInfo})
}

func SendICECandidate(c *gin.Context) {
	token := c.GetHeader("Authorization")
	userID, err := jwt.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var requestBody struct {
		ReceiverID uint   `json:"receiver_id" binding:"required"`
		Candidate  string `json:"candidate" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "receiver id and candidate are required"})
		return
	}

	iceCandidate := models.ICECandidate{
		ReceiverID: requestBody.ReceiverID,
		Candidate:  requestBody.Candidate,
	}

	db := database.Database()
	if err := db.Create(&iceCandidate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save ICE candidate"})
		return
	}

	iceInfo := gin.H{
		"user_id":   userID,
		"candidate": iceCandidate.Candidate,
	}
	websocket.BroadcastToUser(requestBody.ReceiverID, "ice_received", iceInfo)

	c.JSON(http.StatusOK, gin.H{"message": "ice candidate sent", "offer": iceInfo})
}
