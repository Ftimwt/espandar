import React from 'react';
import { Avatar, Space } from 'antd';
import {
  WifiOutlined,
  FileTextOutlined,
  MoreOutlined,
} from '@ant-design/icons';

const SidebarHeader: React.FC = () => {
  return (
    <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
      <Avatar src="http://andressantibanez.com/res/avatar.png" size="large" />
      <Space size="middle">
        <WifiOutlined style={{ fontSize: 20, color: '#727A7E' }} />
        <FileTextOutlined style={{ fontSize: 20, color: '#263238' }} />
        <MoreOutlined style={{ fontSize: 20, color: '#263238' }} />
      </Space>
    </div>
  );
};

export default SidebarHeader;