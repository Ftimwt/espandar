import React, { useState } from 'react';
import { Button, List, Modal } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useGetUsersList } from '../../api/user.ts';
import { getFullname } from '../../utils/user.ts';
import UserAvatar from '../User/UserAvatar.tsx';
import { useNavigate } from 'react-router';

const NewChatButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data } = useGetUsersList();
  const navigate = useNavigate();

  const handleSelect = (id: number) => {
    console.log('شروع چت با:', id);
    navigate(`/chat/${id}`);
    setOpen(false);
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
    </>
  );
};

export default NewChatButton;
