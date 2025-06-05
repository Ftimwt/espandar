import React from 'react';
import { Avatar, Space, Typography } from 'antd';
import {
  SearchOutlined,
  PaperClipOutlined,
  MoreOutlined,
} from '@ant-design/icons';

const ChatHeader: React.FC = () => {
  return (
    <div className="py-2 px-3 bg-gray-100 flex justify-between items-center border-b">
      <div className="flex items-center">
        <Avatar
          src="https://darrenjameseeley.files.wordpress.com/2014/09/expendables3.jpeg"
          size="large"
        />
        <div className="ml-4">
          <Typography.Text strong>New Movie! Expendables 4</Typography.Text>
          <Typography.Text className="block text-xs text-gray-500">
            Andrés, Tom, Harrison, Arnold, Sylvester
          </Typography.Text>
        </div>
      </div>
      <Space size="large">
        <SearchOutlined style={{ fontSize: 20, color: '#26323888' }} />
        <PaperClipOutlined style={{ fontSize: 20, color: '#26323888' }} />
        <MoreOutlined style={{ fontSize: 20, color: '#26323888' }} />
      </Space>
    </div>
  );
};

export default ChatHeader;