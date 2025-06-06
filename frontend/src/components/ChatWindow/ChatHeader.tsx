import React, { useMemo } from 'react';
import { Space, Typography } from 'antd';
import { MoreOutlined, PaperClipOutlined, SearchOutlined } from '@ant-design/icons';
import UserAvatar from '../User/UserAvatar.tsx';
import { useParams } from 'react-router';
import { useGetUserByID } from '../../api/user.ts';
import { getFullname } from '../../utils/user.ts';

const ChatHeader: React.FC = () => {
  const { uuid } = useParams();

  const { data } = useGetUserByID(Number.parseInt(uuid!));

  const user = useMemo(() => data?.data.user, [data]);

  if (!user) return <></>;

  return (
    <div className="py-2 px-3 bg-gray-100 flex justify-between items-center border-b">
      <div className="flex items-center">
        <UserAvatar size="large" user={user} />
        <div className="ml-4">
          <Typography.Text strong>{getFullname(user)}</Typography.Text>
          {/*TODO group members*/}
          {/*<Typography.Text className="block text-xs text-gray-500">*/}
          {/*  Andrés, Tom, Harrison, Arnold, Sylvester*/}
          {/*</Typography.Text>*/}
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
