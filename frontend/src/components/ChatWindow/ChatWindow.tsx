// components/ChatWindow/ChatWindow.tsx
import React, { useState } from 'react';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import { useParams } from 'react-router';
import { useUserStore } from '../../store/userStore.ts';
import ChatMessages from './ChatMessages.tsx';

const ChatWindow: React.FC = () => {
  const { uuid } = useParams();
  const { user } = useUserStore();

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
      <ChatInput
        editingMessageID={editingMessageID}
        editingText={editingText}
        setEditingMessageID={setEditingMessageID}
        setEditingText={setEditingText}
      />
    </div>
  );
};

export default ChatWindow;
