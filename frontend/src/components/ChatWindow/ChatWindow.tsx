import React, { useMemo, useState } from 'react';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import { useParams } from 'react-router';
import { useUserStore } from '../../store/userStore.ts';
import ChatMessages from './ChatMessages.tsx';
import { useGetChatByID } from '../../api/chats.ts';
import type { ChannelRouteType } from '../../api/message.ts';

const ChatWindow: React.FC = () => {
  const { uuid, receiverType } = useParams();
  const { user } = useUserStore();
  const { data } = useGetChatByID(receiverType as ChannelRouteType, Number.parseInt(uuid!));

  const hasAccess = useMemo(() => {
    if (!data?.data) return false;
    if (!('channel' in data.data)) return true;
    return data.data.channel.creator.id == user?.id;
  }, [data]);

  const [editingMessageID, setEditingMessageID] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  if (!uuid || !user) {
    return null;
  }

  return (
    <div className="w-2/3 flex flex-col">
      <ChatHeader />
      <ChatMessages
        setEditingMessageID={setEditingMessageID}
        setEditingText={setEditingText}
      />
      {/*<VideoCall targetID={Number.parseInt(uuid!)} userID={user.id}/>*/}
      {hasAccess && <ChatInput
        editingMessageID={editingMessageID}
        editingText={editingText}
        setEditingMessageID={setEditingMessageID}
        setEditingText={setEditingText}
      />
      }
    </div>
  );
};

export default ChatWindow;
