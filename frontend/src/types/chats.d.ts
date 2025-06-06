interface ChatModel {
  messages: string;
  id: string;
  name: string;
  type: string;
  creator: UserModel;
  last_message_time: string;
  members: UserModel[];
}

interface ChatListResponse {
  chats: ChatModel[];
  total: number;
}
