 
 import React, { useState, useEffect, useRef } from 'react';
 import { useParams, useNavigate } from 'react-router-dom';
 import axios from 'axios';
 import {
   Box, Paper, TextField, Button, IconButton, Typography, Snackbar,
   Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText,
   Checkbox, ListItemIcon,
 } from '@mui/material';
 import { Mic, MicOff, Videocam, VideocamOff, Send, AttachFile, EmojiEmotions } from '@mui/icons-material';
 import { MentionsInput, Mention } from 'react-mentions';
 import EmojiPicker from 'emoji-picker-react';
 import CryptoJS from 'crypto-js';
 
 const AES_KEY = 'this_is_a_32_byte_long_key_1234!';
 const API_URL = 'http://localhost:8080';
 
 const Chat = () => {
   const { id } = useParams();
   const type = 'user';
   const navigate = useNavigate();
   const [messages, setMessages] = useState([]);
   const [newMessage, setNewMessage] = useState('');
   const [selectedFiles, setSelectedFiles] = useState([]);
   const [error, setError] = useState('');
   const [openSnackbar, setOpenSnackbar] = useState(false);
   const [tagSuggestions, setTagSuggestions] = useState([]);
   const [isSuggestionsLoaded, setIsSuggestionsLoaded] = useState(false);
   const [showEmojiPicker, setShowEmojiPicker] = useState(false);
   const [isRecording, setIsRecording] = useState(false);
   const [isMuted, setIsMuted] = useState(false);
   const [isVideoOff, setIsVideoOff] = useState(false);
   const [inCall, setInCall] = useState(false);
   const [openConferenceDialog, setOpenConferenceDialog] = useState(false);
   const [conferenceLink, setConferenceLink] = useState('');
   const [conferenceMembers, setConferenceMembers] = useState([]);
   const [selectedUsers, setSelectedUsers] = useState([]);
   const [users, setUsers] = useState([]);
   const [remoteStreams, setRemoteStreams] = useState({});
   const messagesEndRef = useRef(null);
   const fileInputRef = useRef(null);
   const mediaRecorderRef = useRef(null);
   const audioChunksRef = useRef([]);
   const localVideoRef = useRef(null);
   const peerConnectionsRef = useRef({});
   const socketRef = useRef(null);
   const userId = localStorage.getItem('userId');
   const token = localStorage.getItem('token');
   const isConnectingRef = useRef(false);
 
   // تابع رمزگشایی پیام‌ها
   const decryptMessage = (encryptedContent) => {
     try {
       const bytes = CryptoJS.AES.decrypt(encryptedContent, AES_KEY);
       const decrypted = bytes.toString(CryptoJS.enc.Utf8);
       return decrypted || encryptedContent;
     } catch (err) {
       console.error('Chat: Decryption error:', err);
       return encryptedContent;
     }
   };
 
   // انتخاب endpoint مناسب
   const getEndpoint = () => {
     if (type === 'group') return `/messages/group/${id}`;
     if (type === 'channel') return `/messages/channel/${id}`;
     return `/messages/user/${id}`;
   };
 
   const sendEndpoint = () => {
     if (type === 'group') return `/message/group/${id}`;
     if (type === 'channel') return `/message/channel/${id}`;
     return `/message/user/${id}`;
   };
 
   // اتصال به WebSocket
const connectWebSocket = () => {
  if (isConnectingRef.current || socketRef.current?.readyState === WebSocket.OPEN) {
    console.log('Chat: WebSocket already connecting or open');
    return;
  }

  isConnectingRef.current = true;
  if (socketRef.current) {
    socketRef.current.close();
  }

  const wsUrl = `ws://localhost:8080/ws?receiver_id=${id}&Authorization=${encodeURIComponent(token)}`;
  console.log('Chat: Connecting to WebSocket with URL:', wsUrl);
  socketRef.current = new WebSocket(wsUrl);

  socketRef.current.onopen = () => {
    console.log('Chat: WebSocket connection opened');
    isConnectingRef.current = false;
  };

  socketRef.current.onmessage = (event) => {
    console.log('Chat: WebSocket raw message:', event.data);
    try {
      const message = JSON.parse(event.data);
      console.log('Chat: WebSocket parsed message:', message);
      // اصلاح برای سازگاری با event با حرف کوچک
      const eventName = message.Event || message.event;
      switch (eventName) {
        case 'connect_success':
          console.log('Chat: Connected to WebSocket:', message.data || message.Data);
          break;
        case 'new_message':
          setMessages((prev) => [
            ...prev,
            { ...message.Data, Content: decryptMessage(message.Data.Content) },
          ]);
          break;
        case 'webrtc_offer':
          handleOffer(message.Data, message.From || message.To);
          break;
        case 'webrtc_answer':
          handleAnswer(message.Data, message.From || message.To);
          break;
        case 'webrtc_ice_candidate':
          handleIceCandidate(message.Data, message.From || message.To);
          break;
        case 'conference_invite':
          setConferenceLink(message.Data.invite_link);
          setOpenConferenceDialog(true);
          break;
        default:
          console.log('Chat: Unknown event:', eventName);
      }
    } catch (err) {
      console.error('Chat: Error parsing WebSocket message:', err);
    }
  };

  socketRef.current.onclose = (event) => {
    console.log('Chat: WebSocket disconnected, code:', event.code, 'reason:', event.reason);
    isConnectingRef.current = false;
    if (event.code === 1006) {
      console.log('Chat: Connection refused, checking server status...');
    }
    console.log('Chat: Retrying in 5 seconds...');
    setTimeout(connectWebSocket, 5000);
  };

  socketRef.current.onerror = (err) => {
    console.error('Chat: WebSocket error:', err);
    isConnectingRef.current = false;
  };
};
   
useEffect(() => {
  console.log('Chat: useEffect running, type:', type, 'id:', id, 'token:', token);
  if (!id || id.trim() === '' || isNaN(parseInt(id)) || !token) {
    console.error('Chat: Invalid id or token', { id, token });
    setError('شناسه یا توکن نامعتبر است');
    setOpenSnackbar(true);
    navigate('/contacts');
    return;
  }
       const fetchUsers = async () => {
         try {
           const response = await axios.get(`${API_URL}/users`, {
             headers: { Authorization: `Bearer ${token}` },
           });
           console.log('Chat: fetchUsers response:', response.data);
           setUsers(response.data);
         } catch (err) {
           console.error('Chat: Error fetching users:', err);
           setError('خطا در دریافت کاربران');
           setOpenSnackbar(true);
         }
       };
   
       const fetchMessages = async () => {
         try {
           if (!id || id.trim() === '' || isNaN(parseInt(id))) {
             throw new Error('Invalid receiver ID');
           }
           const endpoint = getEndpoint();
           console.log('Chat: Fetching messages from:', `${API_URL}${endpoint}`);
           const response = await axios.get(`${API_URL}${endpoint}`, {
             headers: { Authorization: `Bearer ${token}` },
           });
           console.log('Chat: fetchMessages response:', response.data);
           setMessages(response.data.map((msg) => ({
             ...msg,
             Content: decryptMessage(msg.Content), // اصلاح رمزگشایی
           })));
         } catch (err) {
           console.error('Chat: Error fetching messages:', err);
           setError('خطا در دریافت پیام‌ها');
           setOpenSnackbar(true);
         }
       };
   
       const fetchTagSuggestions = async () => {
         try {
           console.log('Chat: Fetching tag suggestions');
           const [usersRes, filesRes, workflowsRes] = await Promise.all([
             axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
             axios.get(`${API_URL}/files`, { headers: { Authorization: `Bearer ${token}` } }),
             axios.get(`${API_URL}/workflows`, { headers: { Authorization: `Bearer ${token}` } }),
           ]);
           console.log('Chat: Tag suggestions responses:', {
             users: usersRes.data,
             files: filesRes.data,
             workflows: workflowsRes.data,
           });
   
           const users = usersRes.data
             .filter((user) => user && user.ID && user.Username)
             .map((user) => ({
               id: `user_${user.ID}`,
               display: user.Username,
               type: 'user',
             }));const files = filesRes.data
             .filter((file) => file && file.ID && file.FilePath)
             .map((file) => ({
               id: `file_${file.ID}`,
               display: file.FilePath.split('/').pop() || 'unnamed_file',
               type: 'file',
             }));
   
           const workflows = workflowsRes.data
             .filter((wf) => wf && wf.ID && wf.Title)
             .map((wf) => ({
               id: `workflow_${wf.ID}`,
               display: wf.Title,
               type: 'workflow',
             }));
   
           setTagSuggestions([...users, ...files, ...workflows]);
           setIsSuggestionsLoaded(true);
         } catch (err) {
           console.error('Chat: Error fetching tag suggestions:', err);
           setError('خطا در دریافت پیشنهادات تگ');
           setOpenSnackbar(true);
           setIsSuggestionsLoaded(true);
         }
       };
   
       fetchUsers();
       fetchMessages();
       fetchTagSuggestions();
       connectWebSocket(); // فراخوانی تابع WebSocket
   
       return () => {
         console.log('Chat: Cleaning up WebSocket');
         if (socketRef.current) {
           socketRef.current.close();
           socketRef.current = null;
         }
       };
     }, [id, token, navigate]);

  // اسکرول خودکار
  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // ارسال پیام
  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    if (!id || id.trim() === '' || isNaN(parseInt(id))) {
        setError('شناسه گیرنده نامعتبر است');
        setOpenSnackbar(true);
        return;
    }

    const userId = localStorage.getItem('userId');
    console.log('Chat: userId from localStorage:', userId);
    if (!userId || isNaN(parseInt(userId))) {
        console.error('Chat: Invalid userId:', userId);
        setError('لطفاً دوباره وارد شوید');
        setOpenSnackbar(true);
        return;
    }

    const formData = new FormData();
    const tags = [];
    const userMatches = newMessage.matchAll(/@(\w+)/g);
    for (const match of userMatches) {
        const user = tagSuggestions.find((s) => s.display === match[1]);
        if (user) tags.push({ type: 'user', id: parseInt(user.id.replace('user_', '')), name: match[1] });
    }
    const fileMatches = newMessage.matchAll(/#(\w+)/g);
    for (const match of fileMatches) {
        const file = tagSuggestions.find((s) => s.display === match[1]);
        if (file) tags.push({ type: 'file', id: parseInt(file.id.replace('file_', '')), name: match[1] });
    }
    const workflowMatches = newMessage.matchAll(/#(\w+)/g);
    for (const match of workflowMatches) {
        const workflow = tagSuggestions.find((s) => s.display === match[1]);
        if (workflow) tags.push({ type: 'workflow', id: parseInt(workflow.id.replace('workflow_', '')), name: match[1] });
    }
    formData.append('tags', JSON.stringify(tags));

    if (newMessage.trim()) {
        formData.append('content', newMessage);
    }
    formData.append('type', selectedFiles.length > 0 ? (selectedFiles[0].type.startsWith('image') ? 'picture' : selectedFiles[0].type.startsWith('audio') ? 'voice' : 'video') : 'text');
    formData.append('chat_id', id);

    const allowedTypes = ['image/jpeg', 'image/png', 'audio/webm', 'audio/mp3', 'audio/wav', 'video/mp4'];
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
        const endpoint = `/message/user/${id}`;
        console.log('Chat: Sending message to:', `${API_URL}${endpoint}`);
        const response = await axios.post(`${API_URL}${endpoint}`, formData, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        console.log('Chat: Message sent successfully, response:', response.data);

        const messageData = {
            ID: response.data.ID || Date.now(),
            SenderID: parseInt(userId, 10),
            ReceiverID: parseInt(id, 10),
            Content: newMessage,
            Type: response.data.Type,
            Tags: tags,
            Files: response.data.Files || selectedFiles.map((f) => ({
                Type: f.type.startsWith('image') ? 'picture' : f.type.startsWith('audio') ? 'voice' : f.type.startsWith('video') ? 'video' : 'default',
                FilePath: response.data.FilePaths?.[f.name] || URL.createObjectURL(f),
            })),
            CreatedAt: response.data.CreatedAt || new Date().toISOString(),
            ChatID: response.data.ChatID,
        };

        setMessages((prev) => [...prev, {
            ...messageData,
            Content: decryptMessage(messageData.Content),
        }]);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({Event: "new_message",
              Data: messageData,
              To: id,
          }));
          console.log('Chat: Message sent to WebSocket:', messageData);
      } else {
          console.warn('Chat: WebSocket is not open, message not sent to WebSocket');
      }

      setNewMessage('');
      setSelectedFiles([]);
  } catch (err) {
      console.error('Chat: Error sending message:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
      });
      setError('خطا در ارسال پیام: ' + (err.response?.data?.error || err.message));
      setOpenSnackbar(true);
  }
};

  // آپلود فایل
  const handleFileChange = (event) => {
    setSelectedFiles([...event.target.files]);
  };

  // ضبط صدا
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

  // تماس صوتی/تصویری
  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:your-turn-server', username: 'user', credential: 'pass' },
        ],
      });
      peerConnectionsRef.current[id] = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({ ...prev, [id]: event.streams[0] }));
      };
      pc.onicecandidate = (event) => {if (event.candidate) {
        socketRef.current.send(JSON.stringify({
          event: 'webrtc_ice_candidate',
          data: event.candidate,
          to: id,
        }));
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.send(JSON.stringify({
      event: 'webrtc_offer',
      data: offer,
      to: id,
    }));
    setInCall(true);
  } catch (err) {
    setError('دسترسی به دوربین یا میکروفون ممکن نیست');
    setOpenSnackbar(true);
  }
};

const handleOffer = async (offer, from) => {
  try {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:your-turn-server', username: 'user', credential: 'pass' },
      ],
    });
    peerConnectionsRef.current[from] = pc;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [from]: event.streams[0] }));
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.send(JSON.stringify({
          event: 'webrtc_ice_candidate',
          data: event.candidate,
          to: from,
        }));
      }
    };
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.send(JSON.stringify({
      event: 'webrtc_answer',
      data: answer,
      to: from,
    }));
    setInCall(true);
  } catch (err) {
    setError('خطا در پردازش پیشنهاد تماس');
    setOpenSnackbar(true);
  }
};

const handleAnswer = async (answer, from) => {
  try {
    const pc = peerConnectionsRef.current[from];
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  } catch (err) {
    setError('خطا در پردازش پاسخ تماس');
    setOpenSnackbar(true);
  }
};

const handleIceCandidate = async (candidate, from) => {
  try {
    const pc = peerConnectionsRef.current[from];
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    setError('خطا در پردازش ICE candidate');
    setOpenSnackbar(true);
  }
};

const endVideoCall = () => {
  Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
  if (localVideoRef.current && localVideoRef.current.srcObject) {
    localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
  }
  setRemoteStreams({});
  setInCall(false);
  setIsMuted(false);
  setIsVideoOff(false);
};

const toggleMute = () => {
  if (localVideoRef.current && localVideoRef.current.srcObject) {
    const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }
};

const toggleVideo = () => {
  if (localVideoRef.current && localVideoRef.current.srcObject) {
    const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOff(!videoTrack.enabled);
  }
};

// انتخاب اعضا برای کنفرانس
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

// ایجاد کنفرانس
const startConference = async () => {
  if (selectedUsers.length === 0) {setError('حداقل یک عضو باید انتخاب شود');
    setOpenSnackbar(true);
    return;
  }
  try {
    const response = await axios.post(
      `${API_URL}/conferences`,
      {
        title: 'کنفرانس جدید',
        start_time: new Date().toISOString(),
        user_ids: selectedUsers,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setConferenceLink(response.data.invite_link);
    setConferenceMembers(users.filter((user) => selectedUsers.includes(user.ID)));
    setOpenConferenceDialog(true);
  } catch (err) {
    setError('خطا در ایجاد کنفرانس');
    setOpenSnackbar(true);
  }
};

// شروع کنفرانس چندکاربره
const startMultiUserCall = async (conferenceId) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;
    peerConnectionsRef.current = {};
    setRemoteStreams({});

    conferenceMembers.forEach((member) => {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:your-turn-server', username: 'user', credential: 'pass' },
        ],
      });
      peerConnectionsRef.current[member.ID] = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (event) => {
        setRemoteStreams((prev) => ({ ...prev, [member.ID]: event.streams[0] }));
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.send(
            JSON.stringify({
              event: 'webrtc_ice_candidate',
              data: event.candidate,
              to: member.ID.toString(),
              conference_id: conferenceId,
            })
          );
        }
      };
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socketRef.current.send(
          JSON.stringify({
            event: 'webrtc_offer',
            data: offer,
            to: member.ID.toString(),
            conference_id: conferenceId,
          })
        );
      });
    });
    setInCall(true);
  } catch (err) {
    setError('خطا در شروع کنفرانس');
    setOpenSnackbar(true);
  }
};

return (
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      {messages.map((msg) => (
        <Paper
          key={msg.ID}
          sx={{
            p: 2,
            mb: 2,
            maxWidth: '70%',
            alignSelf: msg.SenderID === parseInt(userId) ? 'flex-end' : 'flex-start',
          }}
        >
          <Typography>
            {msg.Content.split(' ').map((part, index) => {
              if (part.startsWith('@') || part.startsWith('#')) {
                const tag = msg.Tags?.find((t) => t.name === part.slice(1));
                if (tag) {
                  return (
                    <span
                      key={index}
                      style={{ color: 'blue', cursor: 'pointer' }}
                      onClick={() => {
                        if (tag.type === 'user') navigate(`/profile/${tag.id}`);
                        else if (tag.type === 'file') window.open(tag.name, '_blank');
                        else if (tag.type === 'workflow') navigate(`/workflow/${tag.id}`);
                      }}
                    >
                      {part}{' '}
                    </span>
                  );
                }
              }
              return part + ' ';
            })}
          </Typography>
          {msg.Files?.map((file) => (
            <Box key={file.ID}>
              {file.Type === 'picture' && <img src={file.FilePath} alt="attachment" style={{ maxWidth: '200px' }} />}
              {file.Type === 'voice' && <audio controls src={file.FilePath} />}
              {file.Type === 'video' && <video controls src={file.FilePath} style={{ maxWidth: '200px' }} />}
            </Box>
          ))}
        </Paper>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  <Box sx={{ p: 2, borderTop: '1px solid #ccc' }}>
    {showEmojiPicker && <EmojiPicker onEmojiClick={(emoji) => setNewMessage((prev) => prev + emoji.emoji)} />}
    {isSuggestionsLoaded && tagSuggestions.length > 0 ? (
      <MentionsInput
        value={newMessage}
        onChange={(e, newValue) => setNewMessage(newValue)}
        style={{ width: '100%', minHeight: '50px' }}
        placeholder="پیام خود را بنویسید..."
      >
        <Mention
          trigger="@"
          data={tagSuggestions}
          markup="@[display](id)"
          appendSpaceOnAdd
        />
        <Mention
          trigger="#"
          data={tagSuggestions}
          markup="#[display](id)"
          appendSpaceOnAdd
        />
      </MentionsInput>
    ) : (
      <TextField
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="پیام خود را بنویسید..."
        fullWidth
        multiline
      />
    )}
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
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
      <Button variant="contained" onClick={handleSendMessage} endIcon={<Send />}>
        ارسال
      </Button>
      {type === 'user' && (
        <>
          <Button variant="contained" onClick={startVideoCall} disabled={inCall}>
            شروع تماس
          </Button>
          {inCall && (
            <>
              <Button onClick={toggleMute} startIcon={isMuted ? <MicOff /> : <Mic />}>
                {isMuted ? 'فعال کردن صدا' : 'قطع صدا'}
              </Button>
              <Button onClick={toggleVideo} startIcon={isVideoOff ? <VideocamOff /> : <Videocam />}>
                {isVideoOff ? 'فعال کردن ویدیو' : 'قطع ویدیو'}
              </Button>
              <Button variant="contained" color="error" onClick={endVideoCall}>
                پایان تماس
              </Button>
            </>
          )}
        </>
      )}
      <Button variant="contained" onClick={() => setOpenConferenceDialog(true)}>
        ایجاد کنفرانس
      </Button>
    </Box>
  </Box>
  {inCall && (
    <Dialog open={inCall} onClose={endVideoCall} maxWidth="lg" fullWidth>
      <DialogContent>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <video ref={localVideoRef} autoPlay muted style={{ width: '300px', border: '1px solid #ccc' }} />
          {Object.entries(remoteStreams).map(([userId, stream]) => (
            <video
              key={userId}autoPlay
              ref={(el) => el && (el.srcObject = stream)}
              style={{ width: '300px', border: '1px solid #ccc' }}
            />
          ))}
        </Box>
      </DialogContent>
    </Dialog>
  )}
  <Dialog open={openConferenceDialog} onClose={() => setOpenConferenceDialog(false)} maxWidth="sm" fullWidth>
    <DialogTitle>ایجاد کنفرانس</DialogTitle>
    <DialogContent>
      <Typography variant="subtitle1" gutterBottom>
        انتخاب اعضای کنفرانس
      </Typography>
      <List dense>
        {users.map((user) => (
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
      {conferenceLink && (
        <Typography>
          لینک دعوت: <a href={conferenceLink}>{conferenceLink}</a>
        </Typography>
      )}
      {conferenceMembers.length > 0 && (
        <Box>
          <Typography variant="subtitle1">اعضای کنفرانس:</Typography>
          <List>
            {conferenceMembers.map((member) => (
              <ListItem key={member.ID}>
                <ListItemText primary={member.Username} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={startConference}>ایجاد</Button>
      {conferenceLink && (
        <Button onClick={() => startMultiUserCall('conference_id')}>شروع کنفرانس</Button>
      )}
      <Button onClick={() => setOpenConferenceDialog(false)}>بستن</Button>
    </DialogActions>
  </Dialog>
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