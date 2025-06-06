import React, { useEffect } from 'react';
import { useGetUserMessages } from '../../api/user.ts';
import { useParams } from 'react-router';
import MessageItem from './MessageItem.tsx';
import { useUserStore } from '../../store/userStore.ts';

const ChatMessages: React.FC = () => {
  const { uuid } = useParams();
  const [messages, setMessages] = React.useState<Message[]>([]);

  const { data } = useGetUserMessages(Number.parseInt(uuid!));

  const { user } = useUserStore();

  useEffect(() => {
    const msg = data?.data.messages || [];
    msg.reverse();
    setMessages(msg);
  }, [data]);

  return (
    <div className="flex-1 overflow-auto bg-gray-200 px-4 py-3">
      {messages.map((m, i) => (
        <MessageItem message={m.text} time={m.created_at} key={i} isMe={m.sender.id == user?.id} />
      ))}
    </div>
  );
};

export default ChatMessages;
