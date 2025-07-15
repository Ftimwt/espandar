interface Message {
  text: string;
  sender: UserModel;
  CreatedAt: string;
  UpdatedAt: string;
  type: 'alert' | 'message';
  readers?: UserModel[];
   file_url?: string;  
  file_type?: string;
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
