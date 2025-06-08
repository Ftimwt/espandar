type ChannelType = 'private_chat' | 'group_chat' | 'channel';

interface ChatModel {
  avatar: string | undefined;
  messages: string;
  id: string;
  name: string;
  type: ChannelType;
  creator: UserModel;
  last_message_time: string;
  members: UserModel[];
}

interface ChatListResponse {
  chats: ChatModel[];
  total: number;
}
