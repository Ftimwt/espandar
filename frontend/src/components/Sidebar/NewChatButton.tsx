import React, { useState } from 'react';
import { Button, Divider, List, Modal, Space } from 'antd';
import { MessageOutlined, NotificationOutlined, TeamOutlined } from '@ant-design/icons';
import { useGetUsersList } from '../../api/user.ts';
import { getFullname } from '../../utils/user.ts';
import UserAvatar from '../User/UserAvatar.tsx';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import CreateChatModal from './CreateChatModal.tsx';
import { useCreateChannel } from '../../api/channels.ts';

const NewChatButton: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [groupType, setGroupType] = useState<'group' | 'channel' | null>(null);
  const queryClient = useQueryClient();
  const createChannel = useCreateChannel();

  const handleCreateClick = (type: 'group' | 'channel') => {
    setGroupType(type);
    setOpen(false);
    setCreateModalOpen(true);
  };

  const [open, setOpen] = useState(false);
  const { data } = useGetUsersList();
  const navigate = useNavigate();

  const handleSelect = (id: number) => {
    console.log('شروع چت با:', id);
    navigate(`/chat/users/${id}`);
    setOpen(false);
  };

  const handleCreateChat = (data: {
    type: 'group' | 'channel';
    name: string;
    description?: string;
    members: number[];
  }) => {
    console.log('Creating group/channel:', data);
    if (data.type === 'channel') {
      createChannel.mutate(
        {
          name: data.name,
          members: data.members,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chats'] }).then(() => {});
            queryClient.invalidateQueries({ queryKey: ['messages'] }).then(() => {});
          },
        },
      );
    }
  };

  return (
    <>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={<MessageOutlined />}
        className="absolute bottom-6 left-6 shadow-lg z-10"
        onClick={() => setOpen(true)}
      />

      <Modal title="Create a new chat" open={open} onCancel={() => setOpen(false)} footer={null}>
        {/* Action Buttons on Top */}
        <Space className="mb-4">
          <Button icon={<TeamOutlined />} onClick={() => handleCreateClick('group')}>
            Create Group
          </Button>
          <Button icon={<NotificationOutlined />} onClick={() => handleCreateClick('channel')}>
            Create Channel
          </Button>
        </Space>

        <Divider className="my-2" />

        <List
          itemLayout="horizontal"
          dataSource={data?.data.users}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleSelect(item.id)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <List.Item.Meta avatar={<UserAvatar user={item} />} title={getFullname(item)} />
            </List.Item>
          )}
        />
      </Modal>

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
