import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Alert,
} from '@mui/material';

const Chat = ({ token }) => {
  const { id: receiverId } = useParams(); // دریافت receiverId از مسیر
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  console.log('Chat: Rendering, receiverId:', receiverId, 'token:', token);

  // دریافت پیام‌ها از سرور
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        if (!token || !receiverId) {
          throw new Error('Token or receiverId missing');
        }
        console.log('Chat: Fetching messages for user:', receiverId);
        const response = await axios.get(
          `http://localhost:8080/messages/user/${receiverId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log('Chat: Messages response:', response.data);
        setMessages(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Chat: Error fetching messages:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError(
          error.response?.data?.error || 'خطا در بارگذاری پیام‌ها: مشکل ناشناخته'
        );
        setMessages([]);
      }
    };
    fetchMessages();
  }, [receiverId, token]);

  // ارسال پیام جدید
  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      setError('متن پیام نمی‌تواند خالی باشد');
      console.log('Chat: Empty message');
      return;
    }
    try {
      console.log('Chat: Sending message:', newMessage);
      const formData = new FormData();
      formData.append('content', newMessage);
      const response = await axios.post(
        `http://localhost:8080/messages/user/${receiverId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      console.log('Chat: Send message response:', response.data);
      setMessages([...messages, { ...response.data, content: newMessage }]); // اضافه کردن پیام به لیست (بدون رمزنگاری در فرانت)
      setNewMessage('');
      setError('');
    } catch (error) {
      console.error('Chat: Error sending message:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(
        error.response?.data?.error || 'خطا در ارسال پیام: مشکل ناشناخته'
      );
    }
  };

  // بازگشت به صفحه مخاطبین
  const handleBack = () => {
    console.log('Chat: Navigating back to contacts');
    navigate('/contacts');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">چت</Typography>
        <Button variant="outlined" onClick={handleBack}>
          بازگشت به مخاطبین
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 2, mb: 2, maxHeight: 400, overflowY: 'auto' }}>
        {messages.length > 0 ? (
          <List>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  justifyContent:
                    message.sender_id === parseInt(receiverId)
                      ? 'flex-start'
                      : 'flex-end',}}
                      >
                        <ListItemText
                          primary={message.content}
                          secondary={`ارسال‌شده در: ${new Date(
                            message.created_at
                          ).toLocaleString('fa-IR')} | ${message.seen ? 'دیده‌شده' : 'ندیده'}`}
                          sx={{
                            bgcolor:
                              message.sender_id === parseInt(receiverId)
                                ? '#e0e0e0'
                                : '#1976d2',
                            color:
                              message.sender_id === parseInt(receiverId)
                                ? 'black'
                                : 'white',
                            p: 1,
                            borderRadius: 2,
                            maxWidth: '70%',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography>هیچ پیامی وجود ندارد.</Typography>
                )}
              </Paper>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="پیام جدید"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                />
                <Button variant="contained" onClick={handleSendMessage}>
                  ارسال
                </Button>
              </Box>
            </Box>
          );
        };
        
        export default Chat;