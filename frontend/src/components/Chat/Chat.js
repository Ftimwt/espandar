import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Snackbar, Typography } from '@mui/material';
import axios from 'axios';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import CallControls from './CallControls';
import WebSocketService from '../../services/WebSocketService';
import { decryptMessage } from '../../utils/encryption';
import { API_URL } from '../../constants/config';
import { getMessages, markMessageAsSeen, updateMessage } from '../../api';
import { v4 as uuidv4 } from 'uuid';

const Chat = () => {
  const { id } = useParams();
  const location = useLocation();
  const isGroup = location.pathname.includes('/group/');
  const isChannel = location.pathname.includes('/channel/');
  const receiverType = isGroup ? 'group' : isChannel ? 'channel' : 'user';
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [receiverUsername, setReceiverUsername] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const socketRef = useRef(null);
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!id || !token || !userId) {
      setError('شناسه یا توکن نامعتبر است');
      setOpenSnackbar(true);
      navigate('/contacts');
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await getMessages(token, receiverType, id);
        const decryptedMessages = response.map((msg) => {
          try {
            return {
              ...msg,
              Content: msg.Content ? decryptMessage(msg.Content) : '',
              seen: msg.seen || false,
              is_received: msg.is_received || false,
            };
          } catch {
            return null;
          }
        }).filter((msg) => msg);

        setMessages(decryptedMessages);
        decryptedMessages.forEach((msg) => {
          if (msg.SenderID !== parseInt(userId) && !msg.seen) {
            markMessageAsSeen(token, msg.message_id || msg.ID, receiverType).catch(() => {});
          }
        });
      } catch (err) {
        setError('خطا در دریافت پیام‌ها');
        setOpenSnackbar(true);
      }
    };

    const fetchHeaderInfo = async () => {
      try {
        let response;
        if (receiverType === 'user') {
          response = await axios.get(`${API_URL}/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setReceiverUsername(response.data.username);
         } else if (receiverType === 'group') {
          response = await axios.get(`${API_URL}/group/info/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setReceiverUsername(response.data.name || `گروه ${id}`);
        } else if (receiverType === 'channel') {
          response = await axios.get(`${API_URL}/channel/info/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setReceiverUsername(response.data.name || `کانال ${id}`);
        }
      } catch (err) {
        console.error('Error fetching header info:', err);
        setReceiverUsername('نامشخص');
      }
    };

    fetchMessages();
    fetchHeaderInfo();

    socketRef.current = new WebSocketService(id, token, 'chat', (message) => {
      const { event, data } = message;
      if (event === 'new_message') {
        const rawMsg = data?.data || data || {};
        const message_id = data?.message_id || rawMsg.message_id;
        if (!message_id) return; 

      let decryptedContent = '';
        try {
      decryptedContent = decryptMessage(rawMsg.Content || '') || rawMsg.Content || 'فایل ارسالی';
      } catch (err) {
      console.warn('خطا در رمزگشایی پیام:', err);
      decryptedContent = rawMsg.Content || 'فایل ارسالی';
      }
        const finalMessage = { ...rawMsg, Content: decryptedContent, message_id, is_received: true };

        setMessages((prev) => {
          const exists = prev.some((m) => m.message_id === message_id);
          return exists ? prev : [...prev, finalMessage];
        });

        if (rawMsg.SenderID !== parseInt(userId)) {
          markMessageAsSeen(token, message_id, receiverType).catch(() => {});
        }
      } else if (event === 'connect_success') {
        getMessages(token, receiverType, id).then((response) => {
          const decrypted = response.map((msg) => ({
            ...msg,
            Content: msg.Content ? decryptMessage(msg.Content) : '',
          }));
          setMessages(decrypted);
        });
      } else if (event === 'message_seen') {
        const { message_id, seen, is_received } = data;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === message_id ? { ...msg, seen, is_received } : msg
          )
        );
      } else if (event === 'message_deleted') {
        const { message_id } = data;
        setMessages((prev) => prev.filter((msg) => msg.message_id !== message_id));
      } else if (event === 'message_updated') {
        const { message_id, content } = data;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === message_id ? { ...msg, Content: content } : msg
          )
        );
      } else if (event === 'error') {
        setError(data);
        setOpenSnackbar(true);
      }
    });

    return () => socketRef.current?.disconnect();
  }, [id, token, navigate, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

const fetchMembers = async () => {
  try {
    const url =
      receiverType === 'group'
        ? `${API_URL}/group/${id}/members`
        : `${API_URL}/channel/${id}/members`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const list = res.data || [];
    setMembers(list);
  } catch (err) {
    console.error('Error fetching members:', err);
    setMembers([]);
  }
};

  const handleSendMessage = async (newMessage, selectedFiles, tags) => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    if (editingMessage) {
      const messageId = editingMessage.message_id || editingMessage.ID;
      try {
        await updateMessage(token, messageId, newMessage.trim());
        setMessages((prev) =>
          prev.map((msg) =>
            msg.message_id === messageId || msg.ID === messageId
              ? { ...msg, Content: newMessage.trim() }
              : msg
          )
        );
      } catch {
        setError('خطا در ویرایش پیام');
        setOpenSnackbar(true);
      }
      setEditingMessage(null);
      return;
    }

    const messageId = uuidv4();
    if (socketRef.current?.ws?.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      if (selectedFiles.length > 0) {
        reader.onload = () => {
          const fileBase64 = reader.result;
          socketRef.current.ws.send(
            JSON.stringify({
              event: 'new_message',
              data: {
                Content: newMessage.trim() || 'فایل ارسالی',
                UserID: parseInt(id),
                ChatID: null,
                Tags: tags,
                Type: selectedFiles[0].type.startsWith('image')
                  ? 'picture'
                  : selectedFiles[0].type.startsWith('audio')
                  ? 'voice'
                  : selectedFiles[0].type.startsWith('video')
                  ? 'video'
                  : 'file',
                FileName: selectedFiles[0].name,
                FileType: selectedFiles[0].type,
                FileData: fileBase64,
                message_id: messageId,
              }
            })
          );
        };
        reader.readAsDataURL(selectedFiles[0]);
      } else {
        socketRef.current.ws.send(
          JSON.stringify({
            event: 'new_message',
            data: {
              Content: newMessage.trim(),
              UserID: parseInt(id),
              ChatID: null,
              Tags: tags,
              Type: 'text',
              message_id: messageId,
            }
          })
        );
      }
    } else {
      setError('اتصال WebSocket برقرار نیست');
      setOpenSnackbar(true);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#f5f5f5' }}>
  <Typography
    variant="h6"
    sx={{ cursor: 'pointer' }}
    onClick={() => {
      if (receiverType === 'group' || receiverType === 'channel') {
        setShowMembers((prev) => !prev);
        fetchMembers();
      }
    }}
  >
    {receiverUsername || '...'}
  </Typography>

  {['user', 'group', 'channel'].includes(receiverType) && (
  <Box sx={{ display: 'flex', gap: 1 }}>
    <CallControls receiverId={id} token={token} receiverType={receiverType} />
  </Box>
)}
</Box>
      {showMembers && (
  <Box sx={{ px: 2, bgcolor: '#f0f0f0' }}>
    <Typography variant="subtitle2">
      {receiverType === 'group' ? 'اعضای گروه:' : 'اعضای کانال:'}
    </Typography>
    {members.map((m) => (
      <Typography key={m.ID || m.id} variant="body2">
        👤 {m.Username || m.username}
      </Typography>
    ))}
  </Box>
)}
      <MessageList
        messages={messages}
        userId={userId}
        navigate={navigate}
        setEditingMessage={setEditingMessage}
      />
      <div ref={messagesEndRef} />
      <ChatInput
        onSendMessage={handleSendMessage}
        setError={setError}
        setOpenSnackbar={setOpenSnackbar}
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
      />
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={error}
      />
    </Box>
  );
};

export default Chat;
