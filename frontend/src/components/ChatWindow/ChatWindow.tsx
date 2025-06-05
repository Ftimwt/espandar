// components/ChatWindow/ChatWindow.tsx
import React from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

const ChatWindow: React.FC = () => {
  return (
    <div className="w-2/3 flex flex-col">
      <ChatHeader />
      <ChatMessages />
      <ChatInput />
    </div>
  );
};

export default ChatWindow;