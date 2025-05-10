class WebSocketService {
  constructor(receiverId, token, onMessage) {
    this.socket = null;
    this.receiverId = receiverId;
    this.token = token;
    this.onMessage = onMessage;
    this.isConnecting = false;
    this.connect();
  }

  connect() {
    if (this.isConnecting || this.socket?.readyState === WebSocket.OPEN) return;

    this.isConnecting = true;
    const wsUrl = `ws://localhost:8080/ws?receiver_id=${this.receiverId}&Authorization=${encodeURIComponent(this.token)}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.isConnecting = false;
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    };

    this.socket.onclose = (event) => {
      this.isConnecting = false;
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (err) => {
      this.isConnecting = false;
      console.error('WebSocket error:', err);
    };
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export default WebSocketService;