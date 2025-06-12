import React, {useMemo} from 'react';
import {Button, Space, Tooltip, Typography} from 'antd';
import {MoreOutlined, PaperClipOutlined, SearchOutlined, VideoCameraOutlined} from '@ant-design/icons';
import UserAvatar from '../User/UserAvatar.tsx';
import {useParams} from 'react-router';
import {getFullname} from '../../utils/user.ts';
import {useGetChatByID} from '../../api/chats.ts';
import type {ChannelRouteType} from '../../api/message.ts';
import ChatAvatar from '../Chat/ChatAvatar.tsx';
import {userCallStore} from "../../store/callStore.ts";

const ChatHeader: React.FC = () => {
  const {uuid, receiverType} = useParams();
  const {makeCall} = userCallStore();

  const {data} = useGetChatByID(receiverType as ChannelRouteType, Number.parseInt(uuid!));

  const name = useMemo(() => {
    if (!data?.data) return undefined;
    let res = data.data;
    if ('user' in res) {
      return getFullname(res.user);
    }
    return res.channel.name;
  }, [data]);

  const handleVideoCall = () => {
    if (!uuid) return;
    makeCall(Number.parseInt(uuid));
  }

  if (!name || !data?.data) return <></>;

  return (
    <div className="py-2 px-3 bg-gray-100 flex justify-between items-center border-b">
      <div className="flex items-center">
        {'user' in data.data ? (
          <UserAvatar user={data.data.user}/>
        ) : (
          <ChatAvatar chat={data.data.channel}/>
        )}
        <div className="ml-4">
          <Typography.Text strong>{name}</Typography.Text>
          {/*TODO group members*/}
          {'channel' in data.data && (
            <Typography.Text className="block text-xs text-gray-500">
              {data.data.channel.members.map((mem) => getFullname(mem)).join(', ')}
            </Typography.Text>
          )}
        </div>
      </div>
      <Space size="large">
        <Tooltip title="Start video call">
          <Button
            shape="circle"
            icon={<VideoCameraOutlined/>}
            onClick={handleVideoCall}
          />
        </Tooltip>
        <SearchOutlined style={{fontSize: 20, color: '#26323888'}}/>
        <PaperClipOutlined style={{fontSize: 20, color: '#26323888'}}/>
        <MoreOutlined style={{fontSize: 20, color: '#26323888'}}/>
      </Space>
    </div>
  );
};

export default ChatHeader;
