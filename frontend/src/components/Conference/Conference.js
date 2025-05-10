import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText, Checkbox, Typography, Snackbar } from '@mui/material';
import axios from 'axios';
import WebSocketService from '../../services/WebSocketService';
import { API_URL } from '../../constants/config';

const Conference = ({ token }) => {
  const [openConferenceDialog, setOpenConferenceDialog] = useState(false);
  const [conferenceLink, setConferenceLink] = useState('');
  const [conferenceMembers, setConferenceMembers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [inCall, setInCall] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        setError('خطا در دریافت کاربران');
        setOpenSnackbar(true);
      }
    };

    fetchUsers();

    socketRef.current = new WebSocketService('', token, (message) => {
      if (message.event === 'webrtc_offer') handleOffer(message.data, message.from, message.conference_id);
      if (message.event === 'webrtc_answer') handleAnswer(message.data, message.from);
      if (message.event === 'webrtc_ice_candidate') handleIceCandidate(message.data, message.from);
      if (message.event === 'conference_invite') {
        setConferenceLink(message.data?.invite_link || '');
        setOpenConferenceDialog(true);
      }
    });

    return () => socketRef.current.disconnect();
  }, [token]);

  const handleToggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const startConference = async () => {
    if (selectedUsers.length === 0) {
      setError('حداقل یک عضو باید انتخاب شود');
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

  const startMultiUserCall = async (conferenceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!localVideoRef.current) throw new Error('Video element not found');
      localVideoRef.current.srcObject = stream;

      peerConnectionsRef.current = {};
      setRemoteStreams({});

      conferenceMembers.forEach((member) => {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        peerConnectionsRef.current[member.ID] = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          setRemoteStreams((prev) => ({ ...prev, [member.ID]: event.streams[0] }));
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socketRef.current.send({
              event: 'webrtc_ice_candidate',
              data: event.candidate,
              to: member.ID.toString(),
              conference_id: conferenceId,
            });
          }
        };
pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socketRef.current.send({
            event: 'webrtc_offer',
            data: offer,
            to: member.ID.toString(),
            conference_id: conferenceId,
          });
        });
      });
      setInCall(true);
    } catch (err) {
      setError(`خطا در شروع کنفرانس: ${err.message}`);
      setOpenSnackbar(true);
    }
  };

  const handleOffer = async (offer, from, conferenceId) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
          socketRef.current.send({
            event: 'webrtc_ice_candidate',
            data: event.candidate,
            to: from,
            conference_id: conferenceId,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.send({
        event: 'webrtc_answer',
        data: answer,
        to: from,
        conference_id: conferenceId,
      });
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

  const endCall = () => {
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setRemoteStreams({});
    setInCall(false);
  };

  return (
    <>
      <Box sx={{ p: 2 }}>
        <Button variant="contained" onClick={() => setOpenConferenceDialog(true)}>
          ایجاد کنفرانس
        </Button>
      </Box>
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
                  <Checkbox edge="start" checked={selectedUsers.includes(user.ID)} disableRipple />
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
      <Dialog open={inCall} onClose={endCall} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <video ref={localVideoRef} autoPlay muted style={{ width: '300px', border: '1px solid #ccc' }} />
              <Typography variant="caption" sx={{ mt: 1 }}>
                شما
              </Typography>
            </Box>
            {Object.entries(remoteStreams).map(([userId, stream]) => (
              <Box key={userId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <video autoPlay ref={(el) => el && (el.srcObject = stream)} style={{ width: '300px', border: '1px solid #ccc' }} />
                <Typography variant="caption" sx={{ mt: 1 }}>
                  کاربر {userId}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={error}
      />
    </>
  );
};

export default Conference;
