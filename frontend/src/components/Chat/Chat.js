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

const API_URL = 'http://localhost:8080';

const Chat = () => {
  const { type, id } = useParams();
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

  useEffect(() => {
    if (!type || !id) {
      setError('شناسه یا نوع چت نامعتبر است');
      setOpenSnackbar(true);
      navigate('/contacts');
    }
  }, [type, id, navigate]);
  
  useEffect(() => {
    if (!token) {
      setError('توکن نامعتبر است');
      setOpenSnackbar(true);
      navigate('/login');
    }
  }, [token, navigate]);


  // دریافت کاربران، پیام‌ها و پیشنهادات تگ
  useEffect(() => {
    if (!type || !id || !token) return;
  
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('خطا در دریافت کاربران');
        setOpenSnackbar(true);
      }
    };
  
    const fetchMessages = async () => {
      try {
        const endpoint =
          type === 'user'
            ? `/messages/user/${id}`
            : type === 'group'
            ? `/messages/group/${id}`
            : `/messages/channel/${id}`;
        const response = await axios.get(`${API_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(response.data.map((msg) => ({ ...msg, content: msg.Content })));
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('خطا در دریافت پیام‌ها');
        setOpenSnackbar(true);
      }
    };
  
    const fetchTagSuggestions = async () => {
      try {
        const [usersRes, filesRes, workflowsRes] = await Promise.all([
          axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/files`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/workflows`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
  
        const users = usersRes.data
          .filter((user) => user && user.ID && user.Username)
          .map((user) => ({
            id: `user_${user.ID}`,
            display: user.Username,
            type: 'user',
          }));
  
        const files = filesRes.data
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
  
        const validSuggestions = [...users, ...files, ...workflows];
        setTagSuggestions(validSuggestions);
        setIsSuggestionsLoaded(true);
      } catch (err) {
        console.error('Error fetching tag suggestions:', err);
        setError('خطا در دریافت پیشنهادات تگ');
        setOpenSnackbar(true);
        setIsSuggestionsLoaded(true);
      }
    };
  
    fetchUsers();
    fetchMessages();
    fetchTagSuggestions();
  
    socketRef.current = new WebSocket(
      `ws://localhost:8080/ws?Authorization=${encodeURIComponent(token)}&receiver_id=${id}` 
    );
    socketRef.current.onopen = () => console.log('WebSocket connected');
    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message:', message);
      switch (message.event) {
        case 'connect_success':
          console.log('Connected to WebSocket:', message.data);
          break;
        case 'new_message':
          setMessages((prev) => [
            ...prev,
            { ...message.data, content: message.data.Content },
          ]);
          break;
        case 'webrtc_offer':
          handleOffer(message.data, message.from || message.to);
          break;
        case 'webrtc_answer':
          handleAnswer(message.data, message.from || message.to);
          break;
        case 'webrtc_ice_candidate':
          handleIceCandidate(message.data, message.from || message.to);
          break;
        case 'conference_invite':
          setConferenceLink(message.data.invite_link);
          setOpenConferenceDialog(true);
          break;
        default:
          console.log('Unknown event:', message.event);
      }
    };
    socketRef.current.onclose = () => console.log('WebSocket disconnected');
  
    return () => {
      socketRef.current.close();
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    };
  }, [id, type, token]);

  // اسکرول خودکار
  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // رمزگشایی پیام
  const decryptMessage = (encryptedContent) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedContent, AESKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (err) {
      console.error('Decryption error:', err);
      return encryptedContent;
    }
  };

  // ارسال پیام
  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0)return;

    const formData = new FormData();
    const tags = [];
    const userMatches = newMessage.matchAll(/@(\w+)/g);
    for (const match of userMatches) {
      const user = tagSuggestions.find((s) => s.display === match[1]);
      if (user) tags.push({ type: 'user', id: user.id.replace('user_', ''), name: match[1] });
    }
    const fileMatches = newMessage.matchAll(/#(\w+)/g);
    for (const match of fileMatches) {
      const file = tagSuggestions.find((s) => s.display === match[1]);
      if (file) tags.push({ type: 'file', id: file.id.replace('file_', ''), name: match[1] });
    }
    const workflowMatches = newMessage.matchAll(/#(\w+)/g);
    for (const match of workflowMatches) {
      const workflow = tagSuggestions.find((s) => s.display === match[1]);
      if (workflow) tags.push({ type: 'workflow', id: workflow.id.replace('workflow_', ''), name: match[1] });
    }
    formData.append('tags', JSON.stringify(tags));

    if (newMessage.trim()) {
      formData.append('content', newMessage);
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'audio/webm', 'audio/mp3', 'audio/wav', 'video/mp4'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    selectedFiles.forEach((file) => {
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
    });

    try {
      const endpoint =
        type === 'user'
          ? `/messages/user/${id}`
          : type === 'group'
          ? `/messages/group/${id}`
          : `/messages/channel/${id}`;
      await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setNewMessage('');
      setSelectedFiles([]);
    } catch (err) {
      setError('خطا در ارسال پیام');
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
                const tag = msg.tags?.find((t) => t.name === part.slice(1));
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
        valu={newMessage}
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