// WebSocketService.js
class WebSocketService {
  constructor(receiverId, token, callType, onMessage) {
    this.receiverId = receiverId;
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
    const wsUrl = `ws://localhost:8080/ws?receiver_id=${this.receiverId}&call_type=${this.callType}&Authorization=Bearer%20${this.token}`;
    console.log('WebSocketService: Connecting to', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocketService: Connection established');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      console.log('WebSocketService: Raw message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch (err) {
        console.error('WebSocketService: Error parsing message:', err);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocketService: Connection closed', event.code, event.reason);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`WebSocketService: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => this.connect(), this.reconnectInterval);
      } else {
        console.error('WebSocketService: Max reconnect attempts reached');
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocketService: Error:', error);
    };
  }

  sendMessage(content, receiverId, tags, files, messageId, roomId) {
    const message = {
      event: 'new_message',
      data: {
        Content: content,
        UserID: parseInt(receiverId, 10),
        Tags: tags,
        Files: files,
        message_id: messageId,
        type: files.length > 0 ? (files[0].type.startsWith('image') ? 'picture' : 'voice') : 'text',
        room_id: roomId || `room_${Math.min(parseInt(localStorage.getItem('userId'), 10), parseInt(receiverId, 10))}_${Math.max(parseInt(localStorage.getItem('userId'), 10), parseInt(receiverId, 10))}`,
        ChatID: parseInt(receiverId, 10), // فرض بر این است که ChatID برابر UserID است
      },
      to: receiverId,
    };
    this.send(message);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      console.log('WebSocketService: Sending message:', messageString);
      this.ws.send(messageString);
    } else {
      console.error('WebSocketService: Cannot send message, connection state:', this.ws?.readyState);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default WebSocketService;