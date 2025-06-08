interface Message {
  text: string;
  sender: UserModel;
  created_at: string;
  updated_at: string;
  type: 'alert' | 'message';
}

interface MessageResponse {
  messages: Message[];
}

interface UserMessagesRequest {
  limit?: number;
  offset?: number;
  query?: string;
}

interface SendMessageRequest {
  text: string;
}

interface SendMessageResponse {
  message: string;
}

interface MessagesResponse {
  messages: Message[];
}
