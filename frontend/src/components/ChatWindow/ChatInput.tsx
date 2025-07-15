import React, { useState } from 'react';
import { Input, message, Upload, Button } from 'antd';
import { AudioOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons';
import { type ChannelRouteType, useSendMessage } from '../../api/message.ts';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import EmojiPickerButton from './EmojiPickerButton';
import axios from 'axios';
import { useTokenStore } from '../../store/useToken';

const ChatInput: React.FC = () => {
  const [msg, setMsg] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { uuid, receiverType } = useParams();
  const { token } = useTokenStore();

  const send = useSendMessage(Number.parseInt(uuid || '0'), receiverType as ChannelRouteType);

  const handleSend = async () => {
    if (!msg.trim() && !file) {
      console.log('ضبط صدا...');
      return;
    }

    let fileURL = '';
if (file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await axios.post('http://localhost:8080/chats/upload', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fileURL = response.data.file_url;
  } catch (err) {
    message.error('خطا در آپلود فایل').then();
    return;
  }
}

    send.mutate(
      {
        text: msg,
        file_url: fileURL,
        file_type: file?.type || '',
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['messages'] }).then(() => {});
          queryClient.invalidateQueries({ queryKey: ['chats'] }).then(() => {});
          setMsg('');
          setFile(null);
        },
        onError: (error) => {
          console.log(error);
          message.error('error during sending message').then();
        },
      },
    );
  };

  return (
    <div className="bg-gray-100 px-4 py-4 flex items-center gap-4 border-t">
      <EmojiPickerButton onSelect={(emoji) => setMsg(msg + emoji)} />

      <Upload
        beforeUpload={(file) => {
          setFile(file);
          return false;
        }}
        showUploadList={file ? true : false}
      >
        <Button icon={<UploadOutlined />} />
      </Upload>

      <Input
        className="flex-1"
        size="large"
        placeholder="Type a message..."
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onPressEnter={handleSend}
      />

      <div className="cursor-pointer" onClick={handleSend}>
        {msg.trim() || file ? (
          <SendOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        ) : (
          <AudioOutlined style={{ fontSize: 24, opacity: 0.6 }} />
        )}
      </div>
    </div>
  );
};

export default ChatInput;
