import React from 'react';
import { Space, Tooltip } from 'antd';
import { FileTextOutlined, MoreOutlined, WifiOutlined } from '@ant-design/icons';
import { useUserStore } from '../../store/userStore.ts';
import UserPopover from './UserPopover.tsx';

const SidebarHeader: React.FC = () => {
  const { user } = useUserStore();

  console.log(user);

  return (
    <Tooltip title={user?.username} placement="top">
      <div className="py-2 px-3 bg-gray-100 flex justify-between items-center">
        <UserPopover />

        <Space size="middle">
          <WifiOutlined style={{ fontSize: 20, color: '#727A7E' }} />
          <FileTextOutlined style={{ fontSize: 20, color: '#263238' }} />
          <MoreOutlined style={{ fontSize: 20, color: '#263238' }} />
        </Space>
      </div>
    </Tooltip>
  );
};

export default SidebarHeader;
