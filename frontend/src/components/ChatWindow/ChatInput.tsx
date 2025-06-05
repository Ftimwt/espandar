import React from 'react';
import { Input } from 'antd';
import { SmileOutlined, AudioOutlined } from '@ant-design/icons';

const ChatInput: React.FC = () => {
  return (
    <div className="bg-gray-100 px-4 py-4 flex items-center gap-4 border-t">
      <SmileOutlined style={{ fontSize: 24, opacity: 0.6 }} />
      <Input className="flex-1" size="large" placeholder="Type a message..." />
      <AudioOutlined style={{ fontSize: 24, opacity: 0.6 }} />
    </div>
  );
};

export default ChatInput;