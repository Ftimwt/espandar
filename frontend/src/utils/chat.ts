import { getFullname } from './user.ts';

export const getChatName = (chat: ChatModel | ChannelModel | GroupModel) => {
  if (chat.type === 'private_chat') {
    return getFullname(chat.members?.[0]);
  }
  return chat.name;
};

export const getChatAvatar = (chat: ChatModel | ChannelModel) => {
  if (chat.type === 'private_chat') {
    return chat.members?.[0].avatar;
  }
  return chat.avatar;
};
