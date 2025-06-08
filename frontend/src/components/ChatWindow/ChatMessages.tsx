import React, { useEffect } from 'react';
import { useParams } from 'react-router';
import MessageItem from './MessageItem.tsx';
import { useUserStore } from '../../store/userStore.ts';
import { type ChannelRouteType, useGetMessagesList } from '../../api/message.ts';
import { useWebSocket } from '../../context/websocket.tsx';

const ChatMessages: React.FC = () => {
  const { uuid, receiverType } = useParams();

  const { data, refetch } = useGetMessagesList(
    receiverType as ChannelRouteType,
    Number.parseInt(uuid!),
  );

  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    subscribe('notification', function () {
      refetch?.();
    });
  }, [subscribe, unsubscribe]);

  const { user } = useUserStore();

  let msg = data?.data.messages || [];
  msg = [...msg].reverse();
  console.log(data);

  return (
    <div className="flex-1 overflow-auto bg-gray-200 px-4 py-3">
      {msg.map((m, i) =>
        m.type === 'alert' ? (
          <div className="flex justify-center mb-3">
            <div className="bg-yellow-100 rounded px-3 py-2 text-xs text-gray-700">{m.text}</div>
          </div>
        ) : (
          <MessageItem
            message={m.text}
            time={m.created_at}
            key={i}
            isMe={m.sender.id == user?.id}
          />
        ),
      )}
    </div>
  );
};

export default ChatMessages;
