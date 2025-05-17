class WebSocketService {
  constructor(receiverId, token, callType, onMessage) {
    this.receiverId = receiverId;
    this.token = token;
    this.callType = callType;
    this.onMessage = onMessage || (() => console.warn('WebSocket: No onMessage handler provided'));
    this.ws = null;
    this.userId = null;
    this.isDisconnected = false;
    this.connect();
  }

  connect() {
    const encodedToken = encodeURIComponent(this.token);
  const wsUrl = `ws://localhost:8080/ws?receiver_id=${this.receiverId}&Authorization=${encodedToken}&call_type=${this.callType}`;
  console.log('WebSocket: Connecting to', wsUrl);
  this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket: Connection opened for receiver_id:', this.receiverId);
      console.log('WebSocket: Current userId:', this.userId);
    };

    this.ws.onmessage = (event) => {
      console.log('WebSocket: Raw message received:', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket: Parsed message:', message);
        if (message.event === 'connect_success') {
          this.userId = message.data.user_id;
          console.log('WebSocket: User ID set to', this.userId);
        }
        if (message.event === 'webrtc_offer') {
          console.log('WebSocket: Received webrtc_offer from:', message.from);
        }
        this.onMessage(message);
      } catch (err) {
        console.error('WebSocket: Error parsing message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket: Connection closed');
      if (!this.isDisconnected) {
        console.log('WebSocket: Attempting to reconnect in 1 second');
        setTimeout(() => this.connect(), 1000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket: Error:', err);
    };
  }

  send(message) {


    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Sending message:', message);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket: Cannot send message, connection not open');
    }
  }

  disconnect() {
    this.isDisconnected = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default WebSocketService;