import React, { useState } from 'react';
import { Button, Divider, List, Modal, Space } from 'antd';
import {
  MessageOutlined,
  NotificationOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useGetUsersList } from '../../api/user.ts';
import { getFullname } from '../../utils/user.ts';
import UserAvatar from '../User/UserAvatar.tsx';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import CreateChatModal from './CreateChatModal.tsx';
import { useCreateChannel } from '../../api/channels.ts';
import { useCreateGroup } from '../../api/groups.ts';

const NewChatButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [groupType, setGroupType] = useState<'group' | 'channel' | null>(null);
  const queryClient = useQueryClient();
  const createChannel = useCreateChannel();
  const createGroup = useCreateGroup();
  const navigate = useNavigate();

  const { data } = useGetUsersList();

  // باز کردن فرم ایجاد گروه/کانال
  const handleCreateClick = (type: 'group' | 'channel') => {
    setGroupType(type);
    setOpen(false);
    setCreateModalOpen(true);
  };

  // کلیک روی کاربر برای شروع چت
  const handleSelect = (id: number) => {
    navigate(`/chat/users/${id}`);
    setOpen(false);
  };

  // ایجاد گروه یا کانال
  const handleCreateChat = (data: {
    type: 'group' | 'channel';
    name: string;
    description?: string;
    members: number[];
  }) => {
    if (data.type === 'channel') {
      createChannel.mutate(
        { name: data.name, members: data.members },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
          },
        },
      );
    } else {
      createGroup.mutate(
        { name: data.name, description: data.description, members: data.members },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
          },
        },
      );
    }
  };

  return (
    <>
      {/* دکمه شناور برای شروع چت */}
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<MessageOutlined />}
        className="absolute bottom-6 left-6 shadow-lg z-10"
        onClick={() => setOpen(true)}
      />

      {/* مودال اصلی */}
      <Modal
        title="Create a new chat"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        {/* دکمه‌های بالا */}
        <Space wrap className="mb-4">
          <Button icon={<TeamOutlined />} onClick={() => handleCreateClick('group')}>
            Create Group
          </Button>
          <Button icon={<NotificationOutlined />} onClick={() => handleCreateClick('channel')}>
            Create Channel
          </Button>
          <Button
            icon={<VideoCameraOutlined />}
            onClick={() => {
              navigate('/conference');
              setOpen(false);
            }}
          >
            Conferences
          </Button>
        </Space>

        <Divider className="my-2" />

        {/* لیست کاربران */}
        <List
          itemLayout="horizontal"
          dataSource={data?.data.users}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleSelect(item.id)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <List.Item.Meta
                avatar={<UserAvatar user={item} />}
                title={getFullname(item)}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* مودال ساخت گروه/کانال */}
      <CreateChatModal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setGroupType(null);
        }}
        onCreate={handleCreateChat}
        type={groupType}
      />
    </>
  );
};

export default NewChatButton;
