// components/ChatWindow/ChatWindow.tsx
import React from 'react';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import VideoCall from '../VideoCall/VideoCall.tsx';

const ChatWindow: React.FC = () => {
  return (
    <div className="w-2/3 flex flex-col">
      <ChatHeader />
      {/*<ChatMessages />*/}
      <VideoCall />
      <ChatInput />
    </div>
  );
};

export default ChatWindow;
