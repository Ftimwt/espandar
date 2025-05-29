import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, Typography, Grid, Paper } from '@mui/material';
import { toast } from 'react-toastify';

const ConferenceRoom = () => {
  const { room_id } = useParams();
  const [peers, setPeers] = useState({});
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [creatorId, setCreatorId] = useState(null);
  const myUserId = parseInt(localStorage.getItem('userId'));
  
  const kickPeer = (peerId) => {
  if (socketRef.current) {
    socketRef.current.send(JSON.stringify({
      event: 'kick_peer',
      to: peerId,
    }));
  }
};

  useEffect(() => {
    document.title = `اتاق کنفرانس - ${room_id}`;
    start();
    return () => stop();
  }, [room_id]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;

      const token = localStorage.getItem('token');
      const wsURL = `ws://localhost:8080/ws?Authorization=Bearer ${token}&room_id=${room_id}&call_type=video`;
      const socket = new WebSocket(wsURL);
      socketRef.current = socket;

      // دریافت creatorId از API
try {
  const res = await fetch(`http://localhost:8080/conference/${room_id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  setCreatorId(data.creator_id);
} catch (err) {
  console.error("Failed to fetch conference info:", err);
}

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        const { event: type, data, from } = msg;

        switch (type) {
          case 'connect_success':
            socket.send(JSON.stringify({ event: 'join_room' }));
            break;
          case 'peer_joined':
            toast.success('کاربر جدید به اتاق پیوست');
            await createOffer(from);
            break;
          case 'peer_left':
            toast.info('کاربری از اتاق خارج شد');
            removePeer(from);
            break;
          case 'webrtc_offer':
            await handleOffer(from, data);
            break;
          case 'webrtc_answer':
            await handleAnswer(from, data);
            break;
          case 'webrtc_ice_candidate':
            await handleCandidate(from, data);
            break;
          case 'kick_peer':
             toast.info('شما توسط مدیر جلسه حذف شدید');
             endCall();
            break;
          default:
            break;
        }
      };
    } catch (err) {
      console.error('start error:', err);
    }
  };

  const stop = () => {
    Object.values(peerConnections.current).forEach(pc => pc.close());
    if (socketRef.current) socketRef.current.close();
    peerConnections.current = {};
    setPeers({});
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

    pc.ontrack = (event) => {
      setPeers(prev => ({
        ...prev,
        [peerId]: { stream: event.streams[0], name: `کاربر ${peerId}` },
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.send(JSON.stringify({
          event: 'webrtc_ice_candidate',
          data: event.candidate,
          to: peerId,
        }));
      }
    };

    peerConnections.current[peerId] = pc;
    return pc;
  };

  const createOffer = async (peerId) => {
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.send(JSON.stringify({
      event: 'webrtc_offer',
      data: offer,
      to: peerId,
    }));
  };

  const handleOffer = async (peerId, offer) => {
    const pc = createPeerConnection(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.send(JSON.stringify({
      event: 'webrtc_answer',
      data: answer,
      to: peerId,
    }));
  };

  const handleAnswer = async (peerId, answer) => {
    const pc = peerConnections.current[peerId];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleCandidate = async (peerId, candidate) => {
    const pc = peerConnections.current[peerId];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  };

  const removePeer = (peerId) => {
    setPeers(prev => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });

    if (peerConnections.current[peerId]) {
      peerConnections.current[peerId].close();
      delete peerConnections.current[peerId];
    }
  };
  const toggleScreenShare = async () => {
  if (isSharingScreen) {
    // بازگشت به دوربین
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const videoTrack = stream.getVideoTracks()[0];

    const sender = Object.values(peerConnections.current).flatMap(pc =>
      pc.getSenders().filter(s => s.track?.kind === 'video')
    )[0];

    if (sender) sender.replaceTrack(videoTrack);
    localStreamRef.current.getVideoTracks().forEach(track => track.stop());
    localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
    localStreamRef.current.addTrack(videoTrack);
    localVideoRef.current.srcObject = stream;

    localStreamRef.current = stream;
    setIsSharingScreen(false);
  } else {
    // شروع اشتراک صفحه
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = Object.values(peerConnections.current).flatMap(pc =>
        pc.getSenders().filter(s => s.track?.kind === 'video')
      )[0];

      if (sender) sender.replaceTrack(screenTrack);
      localStreamRef.current.getVideoTracks().forEach(track => track.stop());
      localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
      localStreamRef.current.addTrack(screenTrack);
      localVideoRef.current.srcObject = screenStream;

      screenTrack.onended = () => toggleScreenShare(); // بازگشت خودکار
      setIsSharingScreen(true);
    } catch (err) {
      toast.error('دسترسی به اشتراک صفحه رد شد');
      console.error('screen share error', err);
    }
  }
};

  const toggleMic = () => {
    const enabled = !micEnabled;
    setMicEnabled(enabled);
    localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = enabled));
  };

  const toggleCamera = () => {
    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);
    localStreamRef.current.getVideoTracks().forEach(t => (t.enabled = enabled));
  };

  const endCall = () => {
    toast.info('تماس پایان یافت');
    stop();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>اتاق کنفرانس</Typography>
      <Typography variant="body1">شناسه اتاق: <strong>{room_id}</strong></Typography>

      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Paper elevation={3}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%' }}
              />
              <Typography align="center">شما</Typography>
            </Paper>
          </Grid>
         {Object.entries(peers).map(([peerId, { name }]) => (
  <Grid item xs={12} sm={6} key={peerId}>
    <Paper elevation={3}>
      <video
        autoPlay
        playsInline
        ref={(el) => el && (el.srcObject = peers[peerId].stream)}
        style={{ width: '100%' }}
      />
      <Typography align="center">{name}</Typography>
      {creatorId === myUserId && parseInt(peerId) !== creatorId && (
        <Button
          variant="outlined"
          color="error"
          onClick={() => kickPeer(peerId)}
          fullWidth
        >
          حذف کاربر
        </Button>
      )}
    </Paper>
  </Grid>
))}
        </Grid>
      </Box>
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={toggleMic}>
          {micEnabled ? 'قطع میکروفن' : 'فعال‌سازی میکروفن'}
        </Button>
        <Button variant="contained" onClick={toggleCamera}>
          {cameraEnabled ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}
        </Button>
        <Button variant="outlined" color="error" onClick={endCall}>
          قطع تماس
        </Button>
        <Button variant="contained" onClick={toggleScreenShare}>
          {isSharingScreen ? 'پایان اشتراک‌گذاری صفحه' : 'اشتراک‌گذاری صفحه'}
        </Button>
        <Box sx={{ mt: 4 }}>
  <Typography variant="h6">کاربران حاضر:</Typography>
  <ul>
    <li><strong>شما</strong></li>
    {Object.entries(peers).map(([peerId, { name }]) => (
      <li key={peerId}>{name}</li>
    ))}
  </ul>
</Box>
      </Box>
    </Box>
  );
};

export default ConferenceRoom;
