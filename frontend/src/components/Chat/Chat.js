import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CryptoJS from 'crypto-js'; // برای رمزگشایی AES
import EmojiPicker from 'emoji-picker-react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import {
  EmojiEmotions,
  AttachFile,
  Mic,
  Stop,
  Send,
  Videocam,
  CallEnd,
  MicOff,
  VideocamOff,
} from '@mui/icons-material';

const Chat = () => {
  const { id } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const token = localStorage.getItem('token');
  const userIdStr = localStorage.getItem('user_id');
  const userId = userIdStr ? parseInt(userIdStr, 10) : null;
  const AES_KEY = 'this_is_a_32_byte_long_key_1234!'; // کلید AES (باید با سرور یکسان باشد)

  // تابع رمزگشایی پیام
const decryptMessage = (encrypted) => {
  try {
    if (!encrypted || typeof encrypted !== 'string') {
      console.warn('Chat: Invalid encrypted message:', encrypted);
      return encrypted || '';
    }

    // دیکود Base64
    const encryptedBytes = CryptoJS.enc.Base64.parse(encrypted);
    const encryptedStr = encryptedBytes.toString(CryptoJS.enc.Hex);

    // جدا کردن IV (16 بایت اول)
    const ivHex = encryptedStr.slice(0, 32); // 16 بایت = 32 کاراکتر هگز
    const ciphertextHex = encryptedStr.slice(32);

    // تبدیل به فرمت مورد نیاز CryptoJS
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);

    // رمزگشایی
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      CryptoJS.enc.Utf8.parse(AES_KEY),
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      console.warn('Chat: Decryption returned empty string for:', encrypted);
      return encrypted;
    }
    return decryptedText;
  } catch (err) {
    console.warn('Chat: Decryption failed for:', encrypted, 'Error:', err.message);
    return encrypted;
  }
};

  // WebRTC signaling handler
  const handleWebRTCSignaling = useCallback(
    async (message) => {
      try {
        if (message.event === 'webrtc_offer') {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(message.data)
          );
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          socketRef.current.send(
            JSON.stringify({
              event: 'webrtc_answer',
              data: answer,
              to: id,
            })
          );
        } else if (message.event === 'webrtc_answer') {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(message.data)
          );
        } else if (message.event === 'webrtc_ice_candidate') {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(message.data)
          );
        }
      } catch (error) {
        console.error('Chat: Error handling WebRTC signaling:', error);
      }
    },
    [id]
  );

  // Validate userId, token, and receiverId + WebSocket + Fetch messages
  useEffect(() => {
    if (!id || isNaN(id)) {
      setError('شناسه کاربر نامعتبر است');
      console.error('Chat: Invalid receiverId:', id);
      navigate('/');
      return;
    }

    if (!token) {
      setError('توکن ورود یافت نشد');
      console.error('Chat: No token found');
      navigate('/');
      return;
    }

    if (!userIdStr || isNaN(userId)) {
      setError('شناسه کاربر یافت نشد');
      console.error('Chat: Invalid userId:', userIdStr);
      navigate('/');
      return;
    }

    const connectWebSocket = () => {
      console.log('Chat: Attempting WebSocket connection with token:', token.slice(0, 10) + '...');
      const ws = new WebSocket(`ws://localhost:8080/ws?Authorization=${encodeURIComponent(token)}`);
      socketRef.current = ws;ws.onopen = () => {
        console.log('Chat: WebSocket connected');
        setError('');
      };

      ws.onmessage = (event) => {
        console.log('Chat: Raw WebSocket message:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('Chat: Parsed message:', message);
      
          switch (message.event) {
            case 'connect_success':
              console.log('Chat: WebSocket connect success:', message.data);
              break;
            case 'new_message':
              console.log('Chat: New message received:', message.data);
              setMessages((prev) => [
                ...prev,
                {
                  id: message.data.ID,
                  content: decryptMessage(message.data.Content), // رمزگشایی
                  sender_id: message.data.SenderID,
                  receiver_id: message.data.UserID,
                  chat_id: message.data.ChatID,
                  created_at: message.data.CreatedAt,
                  seen: message.data.Seen,
                  is_received: message.data.IsReceived,
                  type: message.data.Type,
                  files: message.data.Files || [],
                },
              ]);
              break;
            case 'webrtc_offer':
            case 'webrtc_answer':
            case 'webrtc_ice_candidate':
              handleWebRTCSignaling(message);
              break;
            default:
              console.log('Chat: Unknown event:', message.event);
          }
        } catch (err) {
          console.error('Chat: Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('Chat: WebSocket disconnected, code:', event.code, 'reason:', event.reason);
        setError('اتصال به سرور قطع شد، در حال تلاش مجدد...');
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (err) => {
        console.error('Chat: WebSocket error:', err);
        setError('خطا در اتصال به سرور');
      };
    };

    connectWebSocket();

    const fetchMessages = async () => {
      try {
        console.log('Chat: Fetching messages for receiver:', id);
        const response = await axios.get(`${API_URL}/messages/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Chat: Messages response:', response.data);
        setMessages(
          response.data.map((msg) => ({
            id: msg.ID,
            content: decryptMessage(msg.Content), // رمزگشایی
            sender_id: msg.SenderID,
            receiver_id: msg.UserID,
            chat_id: msg.ChatID,
            created_at: msg.CreatedAt,
            seen: msg.Seen,
            is_received: msg.IsReceived,
            type: msg.Type,
            files: msg.Files || [],
          }))
        );
      } catch (error) {
        console.error('Chat: Error fetching messages:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setError('خطا در بارگذاری پیام‌ها');
      }
    };

    fetchMessages();

    return () => {
      console.log('Chat: Closing WebSocket');
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [id, token, navigate, API_URL, handleWebRTCSignaling, userId, userIdStr]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebRTC setup for video call
  const startVideoCall = async () => {
    try {
      setIsVideoCall(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (!localVideoRef.current) {
        console.error('Chat: localVideoRef is still null after render');
        setError('عنصر ویدیو در دسترس نیست');
        setIsVideoCall(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };
      peerConnectionRef.current = new RTCPeerConnection(configuration);

      stream.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, stream);
      });peerConnectionRef.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.send(
            JSON.stringify({
              event: 'webrtc_ice_candidate',
              data: event.candidate,
              to: id,
            })
          );
        }
      };

      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            event: 'webrtc_offer',
            data: offer,
            to: id,
          })
        );
      } else {
        console.error('Chat: WebSocket not connected for WebRTC offer');
        setError('اتصال WebSocket برقرار نیست');
        setIsVideoCall(false);
        return;
      }

      console.log('Chat: Video call started');
    } catch (error) {
      console.error('Chat: Error starting video call:', error);
      setError('خطا در شروع ویدیوکال: ' + error.message);
      setIsVideoCall(false);
    }
  };

  const endVideoCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
    }
    setIsVideoCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
    console.log('Chat: Video call ended');
  };

  const toggleMute = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);

      recorder.ondataavailable = (e) => {
        setAudioChunks((prev) => [...prev, e.data]);
        console.log('Chat: Audio chunk received:', e.data);
      };

      recorder.onstop = () => {
        console.log('Chat: Audio recording stopped');
      };

      recorder.start();
      setRecording(true);
      console.log('Chat: Started recording');
    } catch (error) {
      console.error('Chat: Error starting recording:', error);
      setError('خطا در شروع ضبط صدا');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      console.log('Chat: Stopped recording');
    }
  };

  const handleSendMessage = async () => {
    if (!id || isNaN(id)) {
      setError('شناسه کاربر نامعتبر است');
      console.error('Chat: Invalid receiverId:', id);
      return;
    }
  
    if (!token) {
      setError('توکن ورود یافت نشد');
      console.error('Chat: No token found');
      return;
    }
  
    if (isNaN(userId)) {
      setError('شناسه کاربر نامعتبر است');
      console.error('Chat: Invalid userId:', userIdStr);
      navigate('/');
      return;
    }
  
    if (!newMessage.trim() && selectedFiles.length === 0 && audioChunks.length === 0) {
      setError('پیام، فایل یا ویس نمی‌تواند خالی باشد');
      console.log('Chat: Empty message/files/voice');
      return;
    }
  
    try {
      const formData = new FormData();
      let messageType = 'text';
  
      if (newMessage.trim()) {
        formData.append('Content', newMessage);
        console.log('Chat: Appending Content:', newMessage);
      }
  
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          formData.append('files', selectedFiles[i]);
        }
        messageType = 'file';
      }
  
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        formData.append('files', audioBlob, 'voice.webm');
        messageType = 'voice';
      }
  
      formData.append('type', messageType);
      formData.append('ChatID', id); // برای مدل سرور
  
      // لاگ‌گیری دقیق محتوای فرم
      for (let pair of formData.entries()) {
        console.log(`FormData: ${pair[0]}: ${pair[1]}`);
      }
  
      const response = await axios.post(`${API_URL}/message/user/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Chat: Send response:', response.data);
  
      const messageData = {
        id: response.data.message_id,
        content: decryptMessage(response.data.content), // رمزگشایی پاسخ
        sender_id: response.data.sender_id,
        receiver_id: response.data.receiver_id,
        chat_id: response.data.chat_id,
        created_at: response.data.created_at,
        seen: response.data.seen,
        is_received: response.data.is_received,
        type: response.data.type,
        files: response.data.files || [],
      };
  
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            event: 'new_message',
            data: {
              ID: messageData.id,
              Content: response.data.content, // بدون رمزگشایی برای WebSocket
              SenderID: messageData.sender_id,
              UserID: messageData.receiver_id,
              ChatID: messageData.chat_id,
              CreatedAt: messageData.created_at,
              Seen: messageData.seen,
              IsReceived: messageData.is_received,
              Type: messageData.type,
              Files: messageData.files,
            },
          })
        );
        console.log('Chat: Sent message to WebSocket:', messageData);
      }
  
      setMessages((prev) => [...prev, messageData]);
      setNewMessage('');
      setSelectedFiles([]);
      setAudioChunks([]);
      setError('');
    } catch (error) {
      console.error('Chat: Error sending message:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(error.response?.data?.error || `خطا در ارسال پیام: ${error.message}`);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">چت با کاربر {id}</Typography>
        <Button
          variant="contained"
          startIcon={<Videocam />}
          onClick={startVideoCall}
          disabled={isVideoCall}
          sx={{ bgcolor: 'secondary.main' }}
        >
          ویدیوکال
        </Button>
      </Box>

      {isVideoCall && (
        <Box sx={{ p: 2, bgcolor: 'grey.200', display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Box>
            <Typography variant="subtitle1">تصویر شما</Typography>
            <video ref={localVideoRef} autoPlay muted style={{ width: '300px', borderRadius: '8px' }} />
          </Box>
          <Box>
            <Typography variant="subtitle1">تصویر مخاطب</Typography>
            <video ref={remoteVideoRef} autoPlay style={{ width: '300px', borderRadius: '8px' }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button variant="contained" color="error" startIcon={<CallEnd />} onClick={endVideoCall}>
              قطع تماس
            </Button>
            <Button
              variant="contained"
              startIcon={isMuted ? <MicOff /> : <Mic />}onClick={toggleMute}
              >
                {isMuted ? 'فعال کردن صدا' : 'قطع صدا'}
              </Button>
              <Button
                variant="contained"
                startIcon={isVideoOff ? <VideocamOff /> : <Videocam />}
                onClick={toggleVideo}
              >
                {isVideoOff ? 'فعال کردن تصویر' : 'قطع تصویر'}
              </Button>
            </Box>
          </Box>
        )}
  
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
  
  <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
  {messages.length === 0 ? (
    <Typography align="center" color="text.secondary">
      هیچ پیامی وجود ندارد
    </Typography>
  ) : (
    messages.map((msg) => (
      <Paper
        key={msg.id}
        sx={{
          p: 2,
          mb: 1,
          maxWidth: '70%',
          alignSelf: msg.sender_id === userId ? 'flex-end' : 'flex-start',
          bgcolor: msg.sender_id === userId ? 'primary.light' : 'grey.200',
        }}
      >
        {msg.content && <Typography>{msg.content}</Typography>}
        {msg.files &&
          msg.files.map((file, index) => (
            <Box key={index} sx={{ mt: 1 }}>
              {file.Type === 'picture' && (
                <img
                  src={`${API_URL}/Uploads/${file.FilePath.split('/').pop()}`}
                  alt="عکس"
                  style={{ maxWidth: '200px', borderRadius: '8px' }}
                />
              )}
              {file.Type === 'video' && (
                <video controls style={{ maxWidth: '200px', borderRadius: '8px' }}>
                  <source src={`${API_URL}/Uploads/${file.FilePath.split('/').pop()}`} type="video/mp4" />
                </video>
              )}
              {file.Type === 'voice' &&  (file.FilePath.includes('.webm') ? (
                <audio controls>
                  <source src={`${API_URL}/Uploads/${file.FilePath.split('/').pop()}`} type="audio/webm" />
                </audio>
              ) : (
                <audio controls>
                  <source src={`${API_URL}/Uploads/${file.FilePath.split('/').pop()}`} type="audio/mpeg" />
                </audio>
              ))}
              {file.Type === 'default' && (
                <a href={`${API_URL}/Uploads/${file.FilePath.split('/').pop()}`} download>
                  {file.FilePath.split('/').pop()}
                </a>
              )}
            </Box>
          ))}
        <Typography variant="caption" color="text.secondary">
          {new Date(msg.created_at).toLocaleTimeString()}
        </Typography>
      </Paper>
    ))
  )}
  <div ref={messagesEndRef} />
</Box>
  
        <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
              <EmojiEmotions />
            </IconButton>
            {showEmojiPicker && (
              <Box sx={{ position: 'absolute', bottom: '80px', zIndex: 1000 }}>
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </Box>
            )}
            <TextField
              fullWidth
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              variant="outlined"
            />
            <IconButton component="label">
              <AttachFile />
              <input
                type="file"
                multiple
                hidden
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
            </IconButton>
            <IconButton onClick={recording ? stopRecording : startRecording}>
              {recording ? <Stop /> : <Mic />}
            </IconButton>
            <Button
              variant="contained"
              endIcon={<Send />}
              onClick={handleSendMessage}
          >
            ارسال
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Chat;