import React from 'react';
import { Button, Flex, List, Modal } from 'antd';
import { getChatName } from '../../utils/chat.ts';
import ChatAvatar from '../Chat/ChatAvatar.tsx';
import { useGetChatList } from '../../api/chats.ts';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectChat: (channelID: number) => void;
};

const ForwardModal: React.FC<Props> = ({ open, onClose, onSelectChat }) => {
  const { data } = useGetChatList();
  const chats = data?.data.chats || [];

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Forward Message To">
      <List
        dataSource={chats}
        renderItem={(chat) => (
          <List.Item
            actions={[
              <Button type="primary" onClick={() => onSelectChat(chat.id)}>
                Forward
              </Button>,
            ]}
          >
            <Flex justify="center" gap={5} align="center">
              <ChatAvatar chat={chat} />
              {getChatName(chat)}
            </Flex>
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default ForwardModal;
