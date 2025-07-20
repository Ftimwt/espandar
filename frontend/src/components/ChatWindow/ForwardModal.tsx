import React from 'react';
import { Modal, List, Button } from 'antd';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectChat: (channelID: number) => void;
  chats: { id: number; name: string }[];
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
            {chat.name}
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default ForwardModal;
