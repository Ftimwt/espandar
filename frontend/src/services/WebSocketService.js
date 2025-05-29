function createRoomID(myId, receiverId) {
  const sorted = [parseInt(myId), parseInt(receiverId)].sort((a, b) => a - b);
  return `room_${sorted[0]}_${sorted[1]}`;
}
class WebSocketService {
  constructor(myId, receiverId, token, callType, onMessage) {
    this.userId = parseInt(myId); 
    this.receiverId = parseInt(receiverId);
    this.token = token;
    this.callType = callType;
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectInterval = 5000;

    this.connect();
  }
  
connect() {
  const roomID = createRoomID(this.userId, this.receiverId);
  const params = new URLSearchParams();
  params.set("receiver_id", this.receiverId);
  params.set("room_id", roomID);
  params.set("Authorization", `Bearer ${this.token}`);

  if (this.callType && this.callType !== "null" && this.callType !== "") {
    params.set("call_type", this.callType);
  } else {
    params.set("call_type", "chat"); // مقدار پیش‌فرض برای جلوگیری از ارور
  }

  const wsUrl = `ws://localhost:8080/ws?${params.toString()}`;
  console.log('WebSocketService: Connecting to', wsUrl);
  
  this.ws = new WebSocket(wsUrl);

  this.ws.onopen = () => {
    console.log('WebSocketService: Connection established');
    this.reconnectAttempts = 0;
  };

  this.ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('WebSocketService: Message received:', message);
      this.onMessage(message);
    } catch (err) {
      console.error('WebSocketService: Failed to parse message:', err);
    }
  };

  this.ws.onclose = (event) => {
    console.warn('WebSocketService: Connection closed', event.code, event.reason);
    this.ws = null;

    console.log(`WebSocketService: Reconnecting attempt ${this.reconnectAttempts}`);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), this.reconnectInterval);
  };

  this.ws.onerror = (error) => {
    console.error('WebSocketService: Error occurred:', error);
  };
}


 disconnect() {
  if (this.ws) {
    this.ws.close();
    }
  }

}

export default WebSocketService;