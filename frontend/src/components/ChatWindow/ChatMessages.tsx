import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import MessageItem from './MessageItem.tsx';
import { useUserStore } from '../../store/userStore.ts';
import {
  type ChannelRouteType,
  useDeleteMessage,
  useForwardMessage,
  useGetMessagesList,
  useMarkAllAsRead,
} from '../../api/message.ts';
import { useWebSocket } from '../../context/websocket.tsx';
import moment from 'moment';
import ForwardModal from './ForwardModal.tsx';
import axios from 'axios';

type Props = {
  setEditingMessageID: (id: number | null) => void;
  setEditingText: (text: string) => void;
};

const ChatMessages: React.FC<Props> = ({ setEditingMessageID, setEditingText }) => {
  const { uuid, receiverType } = useParams();
  const { user } = useUserStore();
  const { subscribe } = useWebSocket();

  const { mutate: markAllAsRead } = useMarkAllAsRead(
    Number.parseInt(uuid!),
    receiverType as ChannelRouteType,
  );
  const { data, refetch } = useGetMessagesList(
    receiverType as ChannelRouteType,
    Number.parseInt(uuid!),
  );

  const deleteMessageMutation = useDeleteMessage(Number.parseInt(uuid!));
  const forwardMessageMutation = useForwardMessage();

  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [selectedMessageID, setSelectedMessageID] = useState<number | null>(null);
  const [userChats, setUserChats] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead, data]);

  useEffect(() => {
    subscribe('notification', () => refetch?.());
    subscribe(`messages_${receiverType}_${uuid}`, () => refetch?.());
  }, [subscribe, refetch, receiverType, uuid]);

  useEffect(() => {
    axios
      .get('http://localhost:8080/channels', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then((res) => setUserChats(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleDeleteMessage = (messageID: number) => {
    deleteMessageMutation.mutate(messageID, {
      onSuccess: () => refetch?.(),
      onError: (err) => console.error('Error deleting:', err),
    });
  };

  const handleForwardMessage = (messageID: number) => {
    setSelectedMessageID(messageID);
    setForwardModalOpen(true);
  };

  const handleSelectChatToForward = (targetChannelID: number) => {
    if (!selectedMessageID) return;
    forwardMessageMutation.mutate(
      { targetChannelID, messageID: selectedMessageID },
      {
        onSuccess: () => {
          setForwardModalOpen(false);
          refetch?.();
        },
      },
    );
  };

  const handleEditMessage = (messageID: number, text: string) => {
    setEditingMessageID(messageID);
    setEditingText(text);
  };

  const msg = [...(data?.data.messages || [])].reverse();

  return (
    <div className="flex-1 overflow-auto bg-gray-200 px-4 py-3">
      {msg.map((m, i) =>
        m.type === 'alert' ? (
          <div className="flex justify-center mb-3" key={i}>
            <div className="bg-yellow-100 rounded px-3 py-2 text-xs text-gray-700">{m.text}</div>
          </div>
        ) : (
          <MessageItem
            key={i}
            message={m.text}
            files={m.files}
            time={moment(m.CreatedAt).format('HH:mm')}
            sender={m.sender.username}
            chatType={receiverType as ChannelRouteType}
            isMe={m.sender.id == user?.id}
            status={m.readers?.length && m.readers.length > 0 ? 'read' : 'sent'}
            isEdited={m.is_edited}
            onDelete={() => handleDeleteMessage(m.id)}
            onForward={() => handleForwardMessage(m.id)}
            onEdit={() => handleEditMessage(m.id, m.text)}
          />
        ),
      )}

      <ForwardModal
        open={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        onSelectChat={handleSelectChatToForward}
        chats={userChats}
      />
    </div>
  );
};

export default ChatMessages;
