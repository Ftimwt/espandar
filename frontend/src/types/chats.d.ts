type ChannelType = 'private_chat' | 'group_chat' | 'channel';

interface ChatModel {
  id: number;
  avatar: string | undefined;
  last_message?: Message;
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
