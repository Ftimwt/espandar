// components/ChatWindow/ChatWindow.tsx
import React from 'react';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import {useParams} from "react-router";
import {useUserStore} from "../../store/userStore.ts";
import ChatMessages from "./ChatMessages.tsx";

const ChatWindow: React.FC = () => {
  const {uuid} = useParams();
  const {user} = useUserStore();

  if (!uuid || !user) {
    return null;
  }

  return (
    <div className="w-2/3 flex flex-col">
      <ChatHeader/>
      <ChatMessages />
      {/*<VideoCall targetID={Number.parseInt(uuid!)} userID={user.id}/>*/}
      <ChatInput/>
    </div>
  );
};

export default ChatWindow;
