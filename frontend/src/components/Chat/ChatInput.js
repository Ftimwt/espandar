import React, { useState, useRef } from 'react';
import { Box, Button, IconButton } from '@mui/material';
import { Send, AttachFile, Mic, MicOff, EmojiEmotions } from '@mui/icons-material';
import { MentionsInput, Mention } from 'react-mentions';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const ChatInput = ({ onSendMessage, setError, setOpenSnackbar }) => {
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTagSuggestions = async () => {
      try {
        const [usersRes, filesRes] = await Promise.all([
          axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/files`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const users = usersRes.data.map((user) => ({
          id: `user_${user.ID}`,
          display: user.Username,
          type: 'user',
        }));
        const files = filesRes.data.map((file) => ({
          id: `file_${file.ID}`,
          display: file.FilePath.split('/').pop(),
          type: 'file',
        }));

        setTagSuggestions([...users, ...files]);
      } catch (err) {
        setError('خطا در دریافت پیشنهادات تگ');
        setOpenSnackbar(true);
      }
    };

    fetchTagSuggestions();
  }, [setError, setOpenSnackbar, token]);

  const handleFileChange = (event) => {
    setSelectedFiles([...event.target.files]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setSelectedFiles([new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' })]);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('خطا در دسترسی به میکروفون');
      setOpenSnackbar(true);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handleSend = () => {
    const tags = [];
    const userMatches = newMessage.matchAll(/@(\w+)/g);
    for (const match of userMatches) {
      const user = tagSuggestions.find((s) => s.display === match[1]);
      if (user) tags.push({ type: 'user', id: parseInt(user.id.replace('user_', '')), name: match[1] });
    }
    onSendMessage(newMessage, selectedFiles, tags);
    setNewMessage('');
    setSelectedFiles([]);
  };

  return (
    <Box sx={{ p: 2, borderTop: '1px solid #ccc' }}>
      {showEmojiPicker && <EmojiPicker onEmojiClick={(emoji) => setNewMessage((prev) => prev + emoji.emoji)} />}
      <MentionsInput
        value={newMessage}
        onChange={(e, newValue) => setNewMessage(newValue)}
        style={{ width: '100%', minHeight: '50px' }}
        placeholder="پیام خود را بنویسید..."
      >
        <Mention trigger="@" data={tagSuggestions} markup="@[display](id)" appendSpaceOnAdd />
        <Mention trigger="#" data={tagSuggestions} markup="#[display](id)" appendSpaceOnAdd />
      </MentionsInput><Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <EmojiEmotions />
        </IconButton>
        <IconButton onClick={() => fileInputRef.current.click()}>
          <AttachFile />
        </IconButton>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {isRecording ? (
          <IconButton onClick={stopRecording}>
            <MicOff color="error" />
          </IconButton>
        ) : (
          <IconButton onClick={startRecording}>
            <Mic />
          </IconButton>
        )}
        <Button variant="contained" onClick={handleSend} endIcon={<Send />}>
          ارسال
        </Button>
      </Box>
    </Box>
  );
};

export default ChatInput;