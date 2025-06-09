import { Avatar } from 'antd';
import { hashColor } from '../../utils/ui.ts';
import { getChatAvatar, getChatName } from '../../utils/chat.ts';
import { useMemo } from 'react';

interface Props {
  chat: ChatModel | ChannelModel;
}

const ChatAvatar = (props: Props) => {
  let chatName = getChatName(props.chat);

  // first letter
  const firstLetter = useMemo(() => (chatName && chatName.toUpperCase()[0]) || '?', [props.chat]);

  return (
    <Avatar
      src={getChatAvatar(props.chat)}
      {...props}
      style={{ backgroundColor: hashColor(chatName || 'unknown') }}
    >
      {firstLetter}
    </Avatar>
  );
};

export default ChatAvatar;
