import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, List, ListItem, ListItemText, Snackbar, TextField, Checkbox, ListItemIcon,
} from '@mui/material';

const API_URL = 'http://localhost:8080';

const Conference = () => {
  const [openConferenceDialog, setOpenConferenceDialog] = useState(false);
  const [conferenceLink, setConferenceLink] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState('کنفرانس جدید');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMembers(response.data);
      } catch (err) {
        setError('خطا در دریافت کاربران');
        setOpenSnackbar(true);
      }
    };
    fetchUsers();

    // اتصال WebSocket
    socketRef.current = new WebSocket(`ws://localhost:8080/ws?Authorization=${encodeURIComponent(token)}`);
    socketRef.current.onopen = () => console.log('Conference: WebSocket connected with token:', token);
        socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.event) {
        case 'connect_success':
          console.log('Connected to WebSocket:', message.data);
          break;
        case 'webrtc_offer':
          handleOffer(message.data, message.to);
          break;
        case 'webrtc_answer':
          handleAnswer(message.data, message.to);
          break;
        case 'webrtc_ice_candidate':
          handleIceCandidate(message.data, message.to);
          break;
        case 'conference_invite':
          setConferenceLink(message.data.invite_link);
          setOpenConferenceDialog(true);
          break;
      }
    };
    socketRef.current.onerror = (error) => console.error('Conference: WebSocket error:', error);

    socketRef.current.onclose = () => console.log('WebSocket disconnected');

    return () => {
      socketRef.current.close();
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    };
  }, [token]);

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

  const startConference = async () => {
    if (!title.trim()) {
      setError('عنوان کنفرانس نمی‌تواند خالی باشد');
      setOpenSnackbar(true);
      return;
    }
    if (selectedUsers.length === 0) {
      setError('حداقل یک عضو باید انتخاب شود');
      setOpenSnackbar(true);
      return;
    }
    try {
      const response = await axios.post(
        `${API_URL}/conferences`,
        {
          title,
          start_time: new Date(startTime).toISOString(),
          user_ids: selectedUsers,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConferenceLink(response.data.invite_link);
      setOpenConferenceDialog(true);
    } catch (err) {
      setError('خطا در ایجاد کنفرانس');
      setOpenSnackbar(true);
    }
  };

  const startMultiUserCall = async (conferenceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      peerConnectionsRef.current = {};
      setRemoteStreams({});const selectedMembers = members.filter((m) => selectedUsers.includes(m.ID));
      selectedMembers.forEach((member) => {
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

  const handleOffer = async (offer, from) => {
    try {
      const pc = peerConnectionsRef.current[from] || new RTCPeerConnection({
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
          socketRef.current.send(
            JSON.stringify({
              event: 'webrtc_ice_candidate',
              data: event.candidate,
              to: from,
            })
          );
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.send(
        JSON.stringify({
          event: 'webrtc_answer',
          data: answer,
          to: from,
        })
      );
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

  const endCall = () => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setRemoteStreams({});
    setInCall(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button variant="contained" onClick={() => setOpenConferenceDialog(true)}>ایجاد کنفرانس جدید
      </Button>
      <Dialog open={openConferenceDialog} onClose={() => setOpenConferenceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ایجاد کنفرانس</DialogTitle>
        <DialogContent>
          <TextField
            label="عنوان کنفرانس"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            margin="normal"
            required
            error={!!error && !title.trim()}
            helperText={!!error && !title.trim() ? 'عنوان الزامی است' : ''}
          />
          <TextField
            label="زمان شروع"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            fullWidth
            margin="normal"
          />
          <Typography variant="subtitle1" gutterBottom>
            انتخاب اعضا
          </Typography>
          <List dense>
            {members.map((user) => (
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
          {inCall && (
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <video ref={localVideoRef} autoPlay muted style={{ width: '300px', border: '1px solid #ccc' }} />
              {Object.entries(remoteStreams).map(([id, stream]) => (
                <video
                  key={id}
                  autoPlay
                  ref={(el) => el && (el.srcObject = stream)}
                  style={{ width: '300px', border: '1px solid #ccc' }}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!inCall && <Button onClick={startConference}>ایجاد</Button>}
          {conferenceLink && !inCall && (
            <Button onClick={() => startMultiUserCall('conference_id')}>شروع کنفرانس</Button>
          )}
          {inCall && <Button onClick={endCall} color="error">پایان کنفرانس</Button>}
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

export default Conference;