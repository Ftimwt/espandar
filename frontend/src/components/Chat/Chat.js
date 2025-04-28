import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import EmojiPicker from 'emoji-picker-react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
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
  GroupAdd,
  ExitToApp,
} from '@mui/icons-material';
import CreateGroupChannel from './CreateGroupChannel';

const Chat = () => {
  const { type, id } = useParams(); // type: user, group, channel
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
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openChannelDialog, setOpenChannelDialog] = useState(false);
  const [openManageMembersDialog, setOpenManageMembersDialog] = useState(false);
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isCreator, setIsCreator] = useState(false);
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
  const AES_KEY = 'this_is_a_32_byte_long_key_1234!';

  // تابع رمزگشایی پیام
  const decryptMessage = (encrypted) => {
    try {
      if (!encrypted || typeof encrypted !== 'string') {
        return encrypted || '';
      }
      const encryptedBytes = CryptoJS.enc.Base64.parse(encrypted);
      const encryptedStr = encryptedBytes.toString(CryptoJS.enc.Hex);
      const ivHex = encryptedStr.slice(0, 32);
      const ciphertextHex = encryptedStr.slice(32);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const ciphertext = CryptoJS.enc.Hex.parse(ciphertextHex);
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext },
        CryptoJS.enc.Utf8.parse(AES_KEY),
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      return decrypted.toString(CryptoJS.enc.Utf8) || encrypted;
    } catch (err) {
      console.error('Chat: Error decrypting message:', err);
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

  // اتصال WebSocket و لود داده‌ها
  useEffect(() => {
    if (!token || !userId || !id || !['user', 'group', 'channel'].includes(type)) {
      setError('اطلاعات نامعتبر است');
      navigate('/');
      return;
    }

    // جلوگیری از چت با خود کاربر
    if (type === 'user' && parseInt(id, 10) === userId) {
      setError('نمی‌توانید با خودتان چت کنید');
      navigate('/contacts');
      return;
    }

    // دریافت اطلاعات گروه/کانال (فقط برای group و channel)
    const fetchEntity = async () => {
      if (type === 'group' || type === 'channel') {
        try {
          const endpoint = type === 'group' ? `/group/${id}` : `/channel/${id}`;
          const response = await axios.get(`${API_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const entity = response.data;
          setMembers(entity.Members || []);
          setIsCreator(entity.CreatorID === userId);
        } catch (err) {
          setError(`خطا در بارگذاری اطلاعات ${type === 'group' ? 'گروه' : 'کانال'}`);
          console.error(`Error fetching ${type}:`, err);
        }
      }
    };

    // دریافت کاربران موجود برای افزودن
    const fetchAvailableUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAvailableUsers(response.data);
      } catch (err) {
        setError('خطا در دریافت کاربران');
        console.error('Error fetching users:', err);
      }
    };

    // اتصال WebSocket
    const connectWebSocket = () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      console.log('Chat: Attempting WebSocket connection with token:', token);
      const ws = new WebSocket(`ws://localhost:8080/ws?Authorization=${encodeURIComponent(token)}`);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('Chat: WebSocket connected');
        setError('');
      };

      ws.onmessage = (event) => {
        try {
          console.log('Chat: Raw WebSocket message:', event.data);
          const message = JSON.parse(event.data);
          console.log('Chat: Parsed message:', message);
          if (message.event === 'connect_success') {
            console.log('Chat: WebSocket connect success:', message.data);
          } else if (message.event === 'new_message') {
            setMessages((prev) => [
              ...prev,
              {
                id: message.data.ID,
                content: decryptMessage(message.data.Content),
                sender_id: message.data.SenderID,
                receiver_id: message.data.UserID || message.data.GroupID || message.data.ChannelID,
                chat_id: message.data.ChatID,
                created_at: message.data.CreatedAt,
                seen: message.data.Seen,
                is_received: message.data.IsReceived,
                type: message.data.Type,
                files: message.data.Files || [],
              },
            ]);
          } else if (['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate'].includes(message.event)) {
            handleWebRTCSignaling(message);
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

      ws.onerror = (event) => {
        console.error('Chat: WebSocket error:', event);
        setError('خطا در اتصال به سرور');
      };
    };

    // دریافت پیام‌ها
    const fetchMessages = async () => {
      try {
        console.log('Chat: Fetching messages for receiver:', id);
        const response = await axios.get(`${API_URL}/messages/${type}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Chat: Messages response:', response.data);
        setMessages(
          response.data.map((msg) => ({
            id: msg.ID,
            content: decryptMessage(msg.Content),
            sender_id: msg.SenderID,
            receiver_id: msg.UserID || msg.GroupID || msg.ChannelID,
            chat_id: msg.ChatID,
            created_at: msg.CreatedAt,
            seen: msg.Seen,
            is_received: msg.IsReceived,
            type: msg.Type,
            files: msg.Files || [],
          }))
        );
      } catch (error) {
        setError('خطا در بارگذاری پیام‌ها');
        console.error('Error fetching messages:', error);
      }
    };

    fetchEntity();
    fetchAvailableUsers();
    connectWebSocket();
    fetchMessages();

    // Cleanup
    return () => {
      if (socketRef.current) {
        console.log('Chat: Closing WebSocket');
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [id, type, token, userId, navigate, API_URL, handleWebRTCSignaling]);

  // Scroll به انتهای پیام‌ها
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // مدیریت انتخاب کاربران برای افزودن
  const handleToggleUser = (userId) => {
    const currentIndex = selectedUsers.indexOf(userId);
    const newSelected = [...selectedUsers];

    if (currentIndex === -1) {
      newSelected.push(userId);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedUsers(newSelected);
  };

  // افزودن اعضا
  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      setError('حداقل یک کاربر باید انتخاب شود');
      return;
    }

    try {
      const endpoint = type === 'group' ? `/group/${id}/user/` : `/channel/${id}/user/`;
      for (const userId of selectedUsers) {
        await axios.post(`${API_URL}${endpoint}${userId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setOpenManageMembersDialog(false);
      setSelectedUsers([]);
      // به‌روزرسانی لیست اعضا
      const response = await axios.get(`${API_URL}/${type}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(response.data.Members || []);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در افزودن اعضا');
      console.error('Error adding members:', err);
    }
  };

  // حذف عضو
  const handleRemoveMember = async (userId) => {
    try {
      const endpoint = type === 'group' ? `/group/${id}/user/${userId}` : `/channel/${id}/user/${userId}`;
      await axios.delete(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers(members.filter((member) => member.ID !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در حذف عضو');
      console.error('Error removing member:', err);
    }
  };

  // خروج از گروه/کانال
  const handleLeave = async () => {
    try {
      const endpoint = type === 'group' ? `/group/${id}/leave` : `/channel/${id}/leave`;
      await axios.post(`${API_URL}${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در خروج از گروه/کانال');
      console.error('Error leaving:', err);
    }
  };

  // ارسال پیام
  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      const formData = new FormData();
      const encryptedMessage = CryptoJS.AES.encrypt(
        newMessage,
        CryptoJS.enc.Utf8.parse(AES_KEY),
        {
          iv: CryptoJS.lib.WordArray.random(16),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );
      const ivHex = CryptoJS.enc.Hex.stringify(encryptedMessage.iv);
      const ciphertextHex = CryptoJS.enc.Hex.stringify(encryptedMessage.ciphertext);
      const encryptedBase64 = CryptoJS.enc.Base64.stringify(
        CryptoJS.enc.Hex.parse(ivHex + ciphertextHex)
      );
      formData.append('content', encryptedBase64);
      formData.append('type', selectedFiles.length > 0 ? 'file' : 'text');
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_URL}/message/${type}/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: response.data.ID,
          content: newMessage,
          sender_id: userId,
          receiver_id: parseInt(id, 10),
          chat_id: response.data.ChatID,
          created_at: response.data.CreatedAt,
          seen: false,
          is_received: false,
          type: response.data.Type,
          files: response.data.Files || [],
        },
      ]);
      setNewMessage('');
      setSelectedFiles([]);
    } catch (err) {
      setError(err.response?.data?.error || 'خطا در ارسال پیام');
      console.error('Error sending message:', err);
    }
  };

  // انتخاب فایل
  const handleFileChange = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  // مدیریت Emoji
  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // شروع ضبط صدا
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setRecording(true);

      recorder.ondataavailable = (e) => {
        setAudioChunks((prev) => [...prev, e.data]);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setSelectedFiles([new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' })]);
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (err) {
      setError('خطا در شروع ضبط صدا');
      console.error('Error starting recording:', err);
    }
  };

  // توقف ضبط صدا
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  // شروع ویدیوکال
  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.send(
            JSON.stringify({
              event: 'webrtc_ice_candidate',
              data: event.candidate,
              to: id,
            })
          );
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socketRef.current.send(
        JSON.stringify({
          event: 'webrtc_offer',
          data: offer,
          to: id,
        })
      );

      setIsVideoCall(true);
    } catch (err) {
      setError('خطا در شروع ویدیوکال');
      console.error('Error starting video call:', err);
    }
  };

  // پایان ویدیوکال
  const endVideoCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current?.srcObject) {
      remoteVideoRef.current.srcObject = null;
    }
    setIsVideoCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // تغییر وضعیت میکروفون
  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // تغییر وضعیت ویدیو
  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {type === 'user' ? `چت با کاربر ${id}` : type === 'group' ? `گروه ${id}` : `کانال ${id}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {type === 'user' && (
            <Button
              variant="contained"
              startIcon={<Videocam />}
              onClick={startVideoCall}
              disabled={isVideoCall}
              sx={{ bgcolor: 'secondary.main' }}
            >
              ویدیوکال
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => setOpenGroupDialog(true)}
          >
            ایجاد گروه
          </Button>
          <Button
            variant="contained"
            onClick={() => setOpenChannelDialog(true)}
          >
            ایجاد کانال
          </Button>
          {(type === 'group' || type === 'channel') && isCreator && (
            <Button
              variant="contained"
              startIcon={<GroupAdd />}
              onClick={() => setOpenManageMembersDialog(true)}
            >
              مدیریت اعضا
            </Button>
          )}
          {(type === 'group' || type === 'channel') && (
            <Button
              variant="contained"
              startIcon={<ExitToApp />}
              onClick={handleLeave}
              color="error"
            >
              خروج
            </Button>
          )}
        </Box>
      </Box>

      <CreateGroupChannel open={openGroupDialog} onClose={() => setOpenGroupDialog(false)} type="group" />
      <CreateGroupChannel open={openChannelDialog} onClose={() => setOpenChannelDialog(false)} type="channel" />

      <Dialog open={openManageMembersDialog} onClose={() => setOpenManageMembersDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>مدیریت اعضای {type === 'group' ? 'گروه' : 'کانال'}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1">اعضای فعلی</Typography>
          <List dense>
            {members.map((member) => (
              <ListItem key={member.ID}>
                <ListItemText primary={member.Username} />
                {member.ID !== userId && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleRemoveMember(member.ID)}
                  >
                    حذف
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            افزودن اعضای جدید
          </Typography>
          <List dense>
            {availableUsers
              .filter((user) => !members.some((m) => m.ID === user.ID))
              .map((user) => (
                <ListItem key={user.ID} button onClick={() => handleToggleUser(user.ID)}>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedUsers.includes(user.ID)}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText primary={user.Username} />
                </ListItem>
              ))}
          </List>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManageMembersDialog(false)}>لغو</Button>
          <Button onClick={handleAddMembers} variant="contained" color="primary">
            افزودن
          </Button>
        </DialogActions>
      </Dialog>

      {/* سایر بخش‌های رندر (ویدیوکال، پیام‌ها، ورودی پیام) بدون تغییر باقی می‌مانند */}
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
              startIcon={isMuted ? <MicOff /> : <Mic />}
              onClick={toggleMute}
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
              key={msg.id} sx={{
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
                    {file.Type === 'voice' && (
                      <audio controls>
                        <source src={`${API_URL}/Uploads/${file.FilePath.split('/').pop()}`} type="audio/webm" />
                      </audio>
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

      <Box sx={{ p: 2, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
          <EmojiEmotions />
        </IconButton>
        {showEmojiPicker && (
          <Box sx={{ position: 'absolute', bottom: '80px', zIndex: 1000 }}>
            <EmojiPicker onEmojiClick={onEmojiClick} />
          </Box>
        )}
        <Button component="label">
          <AttachFile />
          <input type="file" hidden multiple onChange={handleFileChange} />
        </Button>
        {recording ? (
          <IconButton onClick={stopRecording}>
            <Stop />
          </IconButton>
        ) : (
          <IconButton onClick={startRecording}>
            <Mic />
          </IconButton>
        )}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="پیام خود را بنویسید..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <IconButton color="primary" onClick={handleSendMessage}>
          <Send />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Chat;