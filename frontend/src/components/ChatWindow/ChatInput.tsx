// components/ChatWindow/ChatInput.tsx
import React, { useState } from 'react';
import { Input, message } from 'antd';
import { AudioOutlined, SendOutlined, SmileOutlined } from '@ant-design/icons';
import { type ChannelRouteType, useSendMessage } from '../../api/message.ts';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';

const ChatInput: React.FC = () => {
  const [msg, setMsg] = useState('');

  const queryClient = useQueryClient();

  const { uuid, receiverType } = useParams();

  const send = useSendMessage(Number.parseInt(uuid || '0'), receiverType as ChannelRouteType);

  const handleSend = () => {
    if (msg.trim()) {
      console.log('ارسال پیام:', msg);
      send.mutate(
        {
          text: msg,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] }).then(() => {});
            queryClient.invalidateQueries({ queryKey: ['chats'] }).then(() => {});
            setMsg('');
          },
          onError: (error) => {
            console.log(error);
            message.error('error during sending message').then();
          },
        },
      );
    } else {
      console.log('ضبط صدا...');
    }
  };

  return (
    <div className="bg-gray-100 px-4 py-4 flex items-center gap-4 border-t">
      <SmileOutlined style={{ fontSize: 24, opacity: 0.6 }} />

      <Input
        className="flex-1"
        size="large"
        placeholder="Type a message..."
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onPressEnter={handleSend}
      />

      <div className="cursor-pointer" onClick={handleSend}>
        {msg.trim() ? (
          <SendOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        ) : (
          <AudioOutlined style={{ fontSize: 24, opacity: 0.6 }} />
        )}
      </div>
    </div>
  );
};

export default ChatInput;
