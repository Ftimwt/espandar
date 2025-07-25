import React, { useState } from 'react';
import { Button, Input, message, Upload } from 'antd';
import { AudioOutlined, SendOutlined, UploadOutlined } from '@ant-design/icons';
import { type ChannelRouteType, useSendMessage, useUploadFile, useUpdateMessage } from '../../api/message.ts';
import { useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import EmojiPickerButton from './EmojiPickerButton';
import axios from 'axios';
import { useTokenStore } from '../../store/useToken';

type Props = {
  editingMessageID: number | null;
  editingText: string;
  setEditingMessageID: (id: number | null) => void;
  setEditingText: (text: string) => void;
};

const ChatInput: React.FC<Props> = ({ editingMessageID, editingText, setEditingMessageID, setEditingText }) => {
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
  const { mutate: uploadFileMutate } = useUploadFile();

  const updateMessageMutate = useUpdateMessage(Number.parseInt(uuid || '0'), editingMessageID || 0);

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
    uploadFileMutate(
      { file: blob, name: 'voice.webm' },
      {
        onSuccess: (res) => {
          sendMessage(res.data.id);
        },
        onError: (error) => {
          console.error('error during uploading file', error);
          message.error('error during sending message').then();
        },
      },
    );
  };

  const stopRecording = () => {
    console.log('stopRecording called');
    mediaRecorder?.stop();
    mediaStream?.getTracks().forEach((track) => track.stop());
    setMediaStream(null);
  };

  function sendMessage(fileID?: number) {
    send.mutate(
      {
        text: msg,
        files: fileID ? [fileID] : undefined,
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
      },
    );
  }

  const handleSend = async () => {
    if (!(editingMessageID ? editingText.trim() : msg.trim()) && !file && !audioBlob) {
  console.log('چیزی برای ارسال نیست');
  return;
}

    if (editingMessageID) {
  updateMessageMutate.mutate(editingText, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] }).then(() => {});
      setEditingMessageID(null);
      setEditingText('');
      setMsg('');
    },
  });
  return;
}


    let fileID = 0;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        uploadFileMutate(
          { file, name: file.name },
          {
            onSuccess: (res) => {
              fileID = res.data.id;
            },
            onError: (error) => {
              console.error('error during uploading file', error);
              message.error('error during sending message').then();
            },
          },
        );
        const response = await axios.post('http://localhost:8080/chats/upload', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        fileID = Number.parseInt(response.data.id);
      } catch {
        message.error('خطا در آپلود فایل').then();
        return;
      }
    }

    sendMessage(fileID);
  };

  return (
    <div className="bg-gray-100 px-4 py-4 flex items-center gap-4 border-t">
      <EmojiPickerButton onSelect={(emoji) => setMsg(msg + emoji)} />

      <Upload
        beforeUpload={(file) => {
          setFile(file);
          return false;
        }}
        onRemove={() => {
          setFile(null);
        }}
        maxCount={1}
        showUploadList={!!file}
      >
        <Button icon={<UploadOutlined />} />
      </Upload>

      <Input
        className="flex-1"
        size="large"
        placeholder="Type a message..."
        value={editingMessageID ? editingText : msg}  
        onChange={(e) => {
        if (editingMessageID) setEditingText(e.target.value);
        else setMsg(e.target.value);
        }}
        onPressEnter={handleSend}
      />

      {editingMessageID && (  
        <Button onClick={() => { setEditingMessageID(null); setEditingText(''); }} size="small">
          Cancel Edit
        </Button>
      )}

            {(editingMessageID ? editingText.trim() : msg.trim()) || file || audioBlob ? (
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
