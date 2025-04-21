import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { TextField, Button, Snackbar, Alert, IconButton } from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import Picker from 'emoji-picker-react';

const Chat = ({ receiverID, token }) => {
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:8080/messages/user/${receiverID}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [receiverID, token]);

  const handleSendMessage = async () => {
    if (!messageContent && selectedFiles.length === 0) return;

    const formData = new FormData();
    if (messageContent) {
      formData.append('content', messageContent);
    }
    for (const file of selectedFiles) {
      formData.append('files', file);
    }

    try {
      const response = await axios.post(`http://localhost:8080/message/user/${receiverID}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessages([...messages, response.data]);
      setMessageContent('');
      setSelectedFiles([]);
    } catch (error) {
      setErrorMessage('خطا در ارسال پیام.');
      setOpenSnackbar(true);
    }
  };

  const onEmojiClick = (event, emojiObject) => {
    setMessageContent(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (event) => {
    setSelectedFiles([...event.target.files]);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <div>
      <h2>Chat with User {receiverID}</h2>
      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender_id}:</strong> {msg.content}
            {/* نمایش فایل‌های پیوست شده اگر موجود باشند */}
            {msg.files && msg.files.map(file => (
              <a href={file.filePath} target="_blank" rel="noopener noreferrer" key={file.id}>{file.filePath}</a>
            ))}
          </div>
        ))}
      </div>
      <TextField
        label="Message"
        value={messageContent}
        onChange={(e) => setMessageContent(e.target.value)}
        fullWidth
      />
      <input type="file" multiple onChange={handleFileChange} />
      <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
        <EmojiEmotionsIcon />
      </IconButton>
      {showEmojiPicker && <Picker onEmojiClick={onEmojiClick} />}
      <Button onClick={handleSendMessage}>Send</Button>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error">{errorMessage}</Alert>
      </Snackbar>
    </div>
  );
};

export default Chat;