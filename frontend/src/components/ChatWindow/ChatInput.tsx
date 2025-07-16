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
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [startX, setStartX] = useState<number | null>(null);
  const [canceled, setCanceled] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const queryClient = useQueryClient();
  const { uuid, receiverType } = useParams();
  const { token } = useTokenStore();
  const send = useSendMessage(Number.parseInt(uuid || '0'), receiverType as ChannelRouteType);


  const startRecording = async (e: React.MouseEvent) => {
    setCanceled(false);
    setStartX(e.clientX);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMediaStream(stream);

    const recorder = new MediaRecorder(stream);
    recorder.start();
    setRecording(true);
    setMediaRecorder(recorder);

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = () => {
  console.log('onstop triggered');
  if (!canceled) {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    setAudioBlob(blob);
    setTimeout(() => handleSendWithBlob(blob), 300);
  }
  setRecording(false);
    };

    window.onmousemove = (e) => {
      if (startX !== null && e.clientX < startX - 100) {
        setCanceled(true);
        stopRecording();
        window.onmousemove = null;
        window.onmouseup = null;
      }
    };

    window.onmouseup = () => {
      stopRecording();
      window.onmousemove = null;
      window.onmouseup = null;
    };
  };

  const handleSendWithBlob = async (blob: Blob) => {
  let fileURL = '';

  const formData = new FormData();
  formData.append('file', blob, 'voice.webm');
  try {
    const response = await axios.post('http://localhost:8080/chats/upload', formData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    fileURL = response.data.file_url;
  } catch (err) {
    message.error('خطا در آپلود ویس').then();
    return;
  }

  send.mutate(
    {
      text: '',
      file_url: fileURL,
      file_type: 'audio/webm',
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] }).then(() => {});
        queryClient.invalidateQueries({ queryKey: ['chats'] }).then(() => {});
        setAudioBlob(null);
      },
      onError: (error) => {
        console.log(error);
        message.error('error during sending message').then();
      },
    }
  );
};

  const stopRecording = () => {
  console.log('stopRecording called');
  mediaRecorder?.stop();
  mediaStream?.getTracks().forEach((track) => track.stop());
  setMediaStream(null);
};

  const handleSend = async () => {
    if (!msg.trim() && !file && !audioBlob) {
      console.log('چیزی برای ارسال نیست');
      return;
    }

    let fileURL = '';

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post('http://localhost:8080/chats/upload', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fileURL = response.data.file_url;
      } catch (err) {
        message.error('خطا در آپلود فایل').then();
        return;
      }
    } else if (audioBlob) {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice.webm');
      try {
        const response = await axios.post('http://localhost:8080/chats/upload', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fileURL = response.data.file_url;
      } catch (err) {
        message.error('خطا در آپلود ویس').then();
        return;
      }
    }

    send.mutate(
      {
        text: msg,
        file_url: fileURL,
        file_type: file ? file.type : audioBlob ? 'audio/webm' : '',
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['messages'] }).then(() => {});
          queryClient.invalidateQueries({ queryKey: ['chats'] }).then(() => {});
          setMsg('');
          setFile(null);
          setAudioBlob(null);
        },
        onError: (error) => {
          console.log(error);
          message.error('error during sending message').then();
        },
      }
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

      {msg.trim() || file || audioBlob ? (
        <div className="cursor-pointer" onClick={handleSend}>
          <SendOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        </div>
      ) : (
        <div className="cursor-pointer" onMouseDown={startRecording}>
          <AudioOutlined style={{ fontSize: 24, color: recording ? 'red' : '#555' }} />
        </div>
      )}
    </div>
  );
};

export default ChatInput;
