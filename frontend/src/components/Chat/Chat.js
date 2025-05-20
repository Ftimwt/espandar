import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Snackbar } from '@mui/material';
import axios from 'axios';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import WebSocketService from '../../services/WebSocketService';
import { decryptMessage } from '../../utils/encryption';
import { API_URL } from '../../constants/config';
import { getMessages, markMessageAsSeen } from '../../api';

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const socketRef = useRef(null);
  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const messagesEndRef = useRef(null);

  const getEndpoint = () => `/messages/user/${id}`;
  const sendEndpoint = () => `/messages/user/${id}`;

  useEffect(() => {
    if (!id || !token || !userId) {
      setError('شناسه یا توکن نامعتبر است');
      setOpenSnackbar(true);
      navigate('/contacts');
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for user:', id);
        const response = await getMessages(token, 'user', id);
        console.log('Messages response:', response);
        if (!Array.isArray(response)) {
          setMessages([]);
          return;
        }
        const decryptedMessages = response.map((msg) => {
          try {
            return {
              ...msg,
              Content: msg.Content ? decryptMessage(msg.Content) : null,
              seen: msg.seen || false,
              is_received: msg.is_received || false,
            };
          } catch (err) {
            console.error('Error processing message ID:', msg.ID, err);
            return null;
          }
        }).filter((msg) => msg && msg.Content);
        console.log('Processed messages:', decryptedMessages);
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.ID));
          const newMessages = decryptedMessages.filter((m) => !existingIds.has(m.ID));
          return [...prev, ...newMessages];
        });
        decryptedMessages.forEach((msg) => {
          if (msg.SenderID !== parseInt(userId) && !msg.seen) {
            console.log('Calling markMessageAsSeen for fetched message:', msg.ID);
            markMessageAsSeen(token, msg.ID).catch(() => {});
          }
        });
      } catch (err) {
        console.error('Error fetching messages:', err.response?.data || err.message);
        setError('خطا در دریافت پیام‌ها');
        setOpenSnackbar(true);
      }
    };

    fetchMessages();

    socketRef.current = new WebSocketService(id, token, 'chat', (message) => {
      console.log('WebSocket: Processing message:', message);
      if (message.event === 'new_message') {
        const messageData = message.data;
        if (messageData && !messages.some((msg) => msg.ID === messageData.ID)) {
          try {
            const decryptedContent = messageData.Content
              ? decryptMessage(messageData.Content)
              : 'پیام بدون محتوا';
            setMessages((prev) => [
              ...prev,
              { ...messageData, Content: decryptedContent },
            ]);
            if (messageData.SenderID !== parseInt(userId)) {
              markMessageAsSeen(token, messageData.ID).catch(() => {});
            }
          } catch (err) {
            console.error('Error decrypting WebSocket message:', err);
          }
        }
      } else if (message.event === 'message_seen') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.ID === message.data.message_id
              ? { ...msg, seen: true, is_received: true }
              : msg
          )
        );
      } else if (message.event === 'error') {
        setError(message.data);
        setOpenSnackbar(true);
      }
    });return () => socketRef.current?.disconnect();
  }, [id, token, navigate, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

const handleSendMessage = async (newMessage, selectedFiles, tags) => {
  if (!newMessage.trim() && selectedFiles.length === 0) return;

  try {
    // ارسال پیام از طریق WebSocket
    socketRef.current.sendMessage(
      newMessage.trim() || 'فایل ارسالی',
      id,
      tags,
      selectedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))
    );

    // اگر نیاز به ذخیره پیام در دیتابیس از طریق API دارید، می‌توانید اینجا درخواست HTTP ارسال کنید
    const formData = new FormData();
    const messageId = uuidv4();
    formData.append('content', newMessage.trim() || 'فایل ارسالی');
    formData.append('type', selectedFiles.length > 0 ? (selectedFiles[0].type.startsWith('image') ? 'picture' : 'voice') : 'text');
    formData.append('chat_id', id);
    formData.append('tags', JSON.stringify(tags));
    formData.append('message_id', messageId);


    const allowedTypes = ['image/jpeg', 'image/png', 'audio/webm'];
    const maxSize = 10 * 1024 * 1024;
    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError('نوع فایل غیرمجاز است');
        setOpenSnackbar(true);
        return;
      }
      if (file.size > maxSize) {
        setError('حجم فایل بیش از حد مجاز است');
        setOpenSnackbar(true);
        return;
      }
      formData.append('files', file);
    }

    const response = await axios.post(`${API_URL}${sendEndpoint()}`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    const messageData = { ...response.data, Content: decryptMessage(response.data.Content) };
    setMessages((prev) => [...prev, messageData]);

    socketRef.current.sendMessage(
      messageData.Content,
      id,
      tags,
      selectedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
      messageId // اضافه کردن message_id
    );
  } catch (err) {
    setError('خطا در ارسال پیام: ' + (err.response?.data?.error || err.message));
    setOpenSnackbar(true);
  }
};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <MessageList messages={messages} userId={userId} navigate={navigate} />
      <div ref={messagesEndRef} />
      <ChatInput onSendMessage={handleSendMessage} setError={setError} setOpenSnackbar={setOpenSnackbar} />
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