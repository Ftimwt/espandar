import React, { useMemo } from 'react';
import { Avatar, Button, Popover, Tooltip, Typography } from 'antd';
import { getFullname } from '../../utils/user.ts';
import { useUserStore } from '../../store/userStore.ts';

const UserPopover: React.FC = () => {
  const { user } = useUserStore();
  const onLogout = () => {};

  const firstLetter = useMemo(() => user?.username && user.username[0].toUpperCase(), [user]);

  if (!user) return;

  const content = (
    <div className="w-48">
      <Typography.Text strong>{getFullname(user)}</Typography.Text>
      <Typography.Paragraph className="text-xs text-gray-500 mb-2 truncate">
        {user.username}
      </Typography.Paragraph>
      {user.status && (
        <div
          className={`text-xs mb-2 ${
            user.status === 'online' ? 'text-green-500' : 'text-gray-400'
          }`}
        >
          {user.status === 'online' ? '🟢 آنلاین' : '⚪️ آفلاین'}
        </div>
      )}
      <Button type="primary" danger size="small" block onClick={onLogout}>
        خروج
      </Button>
    </div>
  );
  return (
    <Tooltip title={user?.username} placement="top">
      <Popover content={content} trigger="click" placement="bottomLeft">
        <Avatar
          src={user.avatar?.length ? user.avatar : firstLetter}
          size="large"
          className="cursor-pointer"
        >
          {firstLetter}
        </Avatar>
      </Popover>
    </Tooltip>
  );
};

export default UserPopover;
