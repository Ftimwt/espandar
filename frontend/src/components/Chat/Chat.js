import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Snackbar } from '@mui/material';
import axios from 'axios';
import ChatInput from './ChatInput';
import MessageList from './MessageList';
import WebSocketService from '../../services/WebSocketService';
import { decryptMessage } from '../../utils/encryption';
import { API_URL } from '../../constants/config';

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

  const getEndpoint = () => `/messages/user/${id}`; // ساده‌سازی برای کاربر
  const sendEndpoint = () => `/message/user/${id}`;

  useEffect(() => {
    if (!id || !token || !userId) {
      setError('شناسه یا توکن نامعتبر است');
      setOpenSnackbar(true);
      navigate('/contacts');
      return;
    }

    // بارگذاری پیام‌ها
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}${getEndpoint()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!Array.isArray(response.data)) {
          setMessages([]);
          return;
        }
        setMessages(
          response.data.map((msg) => ({
            ...msg,
            Content: msg.Content ? decryptMessage(msg.Content) : 'پیام بدون محتوا',
          }))
        );
      } catch (err) {
        setError('خطا در دریافت پیام‌ها');
        setOpenSnackbar(true);
      }
    };

    fetchMessages();

    // اتصال به WebSocket
    socketRef.current = new WebSocketService(id, token, (message) => {
      if (message.event === 'new_message' && message.data) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.ID === message.data.ID)) return prev;
          return [...prev, { ...message.data, Content: decryptMessage(message.data.Content) }];
        });
      }
    });

    return () => socketRef.current.disconnect();
  }, [id, token, navigate, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (newMessage, selectedFiles, tags) => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    const formData = new FormData();
    formData.append('content', newMessage.trim() || 'فایل ارسالی');
    formData.append('type', selectedFiles.length > 0 ? (selectedFiles[0].type.startsWith('image') ? 'picture' : 'voice') : 'text');
    formData.append('chat_id', id);
    formData.append('tags', JSON.stringify(tags));

    const allowedTypes = ['image/jpeg', 'image/png', 'audio/webm'];
    const maxSize = 10 * 1024 * 1024; // 10MB
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

    try {
      const response = await axios.post(`${API_URL}${sendEndpoint()}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      const messageData = { ...response.data, Content: decryptMessage(response.data.Content) };
      setMessages((prev) => [...prev, messageData]);

      socketRef.current.send({
        event: 'new_message',
        data: messageData,
        to: id.toString(),
      });
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