import React, {useEffect} from 'react';
import {useParams} from 'react-router';
import MessageItem from './MessageItem.tsx';
import {useUserStore} from '../../store/userStore.ts';
import {type ChannelRouteType, useGetMessagesList, useMarkAllAsRead} from '../../api/message.ts';
import {useWebSocket} from '../../context/websocket.tsx';
import moment from "moment";

const ChatMessages: React.FC = () => {
  const {uuid, receiverType} = useParams();

  const {mutate, data: readResponse} = useMarkAllAsRead(Number.parseInt(uuid!), receiverType as ChannelRouteType);

  const {data, refetch} = useGetMessagesList(
    receiverType as ChannelRouteType,
    Number.parseInt(uuid!),
  );

  useEffect(() => {
    if (!readResponse) return;
  }, [readResponse]);

  useEffect(() => {
    mutate();
  }, [mutate, data]);

  const {subscribe, unsubscribe} = useWebSocket();

  useEffect(() => {
    subscribe('notification', function () {
      refetch?.();
    });

    subscribe(`messages_${receiverType}_${uuid}`, function () {
      refetch?.();
    });
  }, [subscribe, unsubscribe]);

  const {user} = useUserStore();

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
            time={moment(m.CreatedAt).format('HH:mm')}
            sender={m.sender.username}
            key={i}
            chatType={receiverType as ChannelRouteType}
            isMe={m.sender.id == user?.id}
            status={m.readers?.length && m.readers.length > 0 ? 'read' : 'sent'}
          />
        ),
      )}
    </div>
  );
};

export default ChatMessages;
