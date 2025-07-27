import React from 'react';
import { Button, Flex, List, Modal } from 'antd';
import { getChatName } from '../../utils/chat.ts';
import ChatAvatar from '../Chat/ChatAvatar.tsx';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectChat: (channelID: number) => void;
  chats: ChatModel[];
};

const ForwardModal: React.FC<Props> = ({ open, onClose, onSelectChat, chats }) => {
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
