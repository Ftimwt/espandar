import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Box, Button, Dialog, DialogContent, DialogActions, Typography, Snackbar, IconButton } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, CallEnd } from '@mui/icons-material';
import WebSocketService from '../../services/WebSocketService';
import { startCall, joinCall } from '../../api';

const waitForWebSocketOpen = (ws) => {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) return resolve();
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        clearInterval(interval);
        resolve();
      } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        clearInterval(interval);
        reject(new Error('WebSocket connection failed.'));
      }
    }, 100);
  });
};

const CallComponent = ({ receiverId, token, callType, onEndCall, receiverType }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const isVideoCall = useMemo(() => {
  return (incomingCall?.callType === 'video') || (!incomingCall && callType === 'video');
}, [incomingCall, callType]);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const localVideoRef = useRef(null);
  const pendingCandidatesRef = useRef({});
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);
  const [ringing, setRinging] = useState(false);
  const ringTimeoutRef = useRef(null);

  const sendIfReady = (message) => {
    const ws = socketRef.current?.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not ready. Dropping message:", message);
    }
  };

  const handleOffer = useCallback(async (offer, from, roomID, offerCallType) => {
    try {
      console.log('handleOffer: Received offer from:', from, 'offer:', offer, 'roomID:', roomID);
      if (!from) {
        setError('خطا: شناسه فرستنده نامشخص');
        setOpenSnackbar(true);
        return;
      }
       if (peerConnectionsRef.current[receiverId]) {
       peerConnectionsRef.current[receiverId].close();
       delete peerConnectionsRef.current[receiverId];
      }
      if (pendingCandidatesRef.current[receiverId]) {
       delete pendingCandidatesRef.current[receiverId];
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionsRef.current[from] = pc;

      const isVideo = offerCallType === 'video';
      const constraints = { video: isVideo, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('handleOffer: Got local stream:', stream);
      if (isVideo && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log('handleOffer: Received remote stream from:', from);
        setRemoteStreams((prev) => ({ ...prev, [from]: event.streams[0] }));
      };
      pc.onicecandidate = (event) => {
  if (event.candidate) {
    const ws = socketRef.current?.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("ICE candidate not sent: WebSocket is null or not open.");
      return;
    }

    ws.send(JSON.stringify({
      event: 'webrtc_ice_candidate',
      data: event.candidate,
      to: String(from),
    }));
  }
};

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      if (pendingCandidatesRef.current[from]) {
  for (const candidate of pendingCandidatesRef.current[from]) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
  delete pendingCandidatesRef.current[from];
}

if (pc.signalingState !== 'have-remote-offer') {
  console.warn('Cannot create answer. Current signalingState:', pc.signalingState);
  return;
}
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
      console.log('handleOffer: Sending answer to:', from);
     sendIfReady({
  event: 'webrtc_answer',
  data: answer,
  to: String(from),
});
      setInCall(true);
      setIncomingCall(null);
    } catch (err) {
      console.error('handleOffer: Error:', err);
      setError(`خطا در پردازش پیشنهاد تماس: ${err.message}`);
      setOpenSnackbar(true);
    }
  }, [isVideoCall]);

  const handleAnswer = useCallback(async (answer, from) => {
  try {
    console.log('handleAnswer: Received answer from:', from);
    const pc = peerConnectionsRef.current[from];
    if (!pc) {
      throw new Error(`No peer connection found for user ${from}`);
    }

    if (pc.signalingState !== 'have-local-offer') {
      console.warn('handleAnswer: Skipping because signalingState is', pc.signalingState);
      return;
    }

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    setInCall(true);
  } catch (err) {
    console.error('handleAnswer: Error:', err);
    setError('خطا در پردازش پاسخ تماس');
    setOpenSnackbar(true);
  }
}, []);

  const handleIceCandidate = useCallback(async (candidate, from) => {
    try {
      const pc = peerConnectionsRef.current[from];
if (!pc?.remoteDescription || !pc.remoteDescription.type) {
  console.warn('Queuing ICE: remoteDescription not set yet');
  if (!pendingCandidatesRef.current[from]) {
    pendingCandidatesRef.current[from] = [];
  }
  pendingCandidatesRef.current[from].push(candidate);
  return;
}
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('handleIceCandidate: Error:', err);
      setError('خطا در پردازش ICE candidate');
      setOpenSnackbar(true);
    }
  }, []);

    const rejectCall = useCallback(() => {
  if (!incomingCall) return;
  const { roomID, from } = incomingCall;
  clearTimeout(ringTimeoutRef.current);
  setRinging(false);
  sendIfReady({
  event: 'call_rejected',
  data: { roomID },
  to: from,
});
  setIncomingCall(null);
}, [incomingCall, receiverId]);

const handleIncomingCall = useCallback((data) => {
  console.log('handleIncomingCall: Incoming call:', data);
  setIncomingCall(data); // callType در این شیء هست

  // 💡 WebSocket را مجدداً با callType جدید راه‌اندازی کن
  if (socketRef.current) {
    socketRef.current.disconnect();
    socketRef.current = null;
  }

  socketRef.current = new WebSocketService(receiverId, token, data.callType, (message) => {
    console.log('CallComponent (reconnected): WebSocket message:', message);
    if (message.event === 'webrtc_offer') {
      const { data, from, roomID, callType } = message.data;
      handleOffer(data, from, roomID, callType); // ✅
    }
    if (message.event === 'webrtc_answer') {
      const { data, from } = message.data;
      handleAnswer(data, from);
    }
    if (message.event === 'webrtc_ice_candidate') {
      const { data, from } = message.data;
      handleIceCandidate(data, from);
    }
    if (message.event === 'call_rejected') {
      setError('تماس رد شد');
      setOpenSnackbar(true);
      onEndCall();
    }
  });

  socketRef.current.connect();

  setRinging(true);
  setIsVideoOff(data.callType !== 'video');

  ringTimeoutRef.current = setTimeout(() => {
    console.log('handleIncomingCall: Ring timeout reached. Auto rejecting.');
    rejectCall();
  }, 30000);
}, [receiverId, token, handleOffer, handleAnswer, handleIceCandidate, onEndCall, rejectCall]);

    const handleSocketMessage = useCallback((message) => {
  console.log('CallComponent: WebSocket message:', message);
  switch (message.event) {
    case 'error':
      setError(message.data.message);
      setOpenSnackbar(true);
      break;
    case 'call_incoming':
      handleIncomingCall(message.data);
      break;
    case 'webrtc_offer':
      handleOffer(message.data.data, message.data.from, message.data.roomID, message.data.callType); 
      break;
    case 'webrtc_answer':
      handleAnswer(message.data.data, message.data.from);
      break;
    case 'webrtc_ice_candidate':
      handleIceCandidate(message.data.data, message.data.from);
      break;
    case 'call_rejected':
      setError('تماس رد شد');
      setOpenSnackbar(true);
      onEndCall();
      break;
    default:
      break;
  }
}, [handleIncomingCall, handleOffer, handleAnswer, handleIceCandidate, onEndCall]);

  useEffect(() => {
  if (incomingCall !== null) return; // ⛔ وقتی تماس دریافتی داریم، WebSocket ایجاد نکن!

  console.log('CallComponent: Initializing default WebSocket with callType:', callType);
  socketRef.current = new WebSocketService(receiverId, token, callType, handleSocketMessage);
  socketRef.current.connect();

  return () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  };
}, [receiverId, token, callType, incomingCall, handleSocketMessage]);

  const acceptCall = async () => {
    try {
      const joinData = await joinCall(token, {
        roomID: incomingCall.roomID,
        callType: incomingCall.callType,
      });
      console.log('acceptCall: joinCall response:', joinData);
      clearTimeout(ringTimeoutRef.current);
      setRinging(false);
      setInCall(true);
      sendIfReady({
  event: 'call_accepted',
  data: { roomID: incomingCall.roomID },
  to: incomingCall.from,
});
      setIncomingCall(null);
    } catch (err) {
      console.error('acceptCall: Error:', err);
      setError(`خطا در قبول تماس: ${err.message}`);
      setOpenSnackbar(true);
    }
  };

useEffect(() => {
  if (incomingCall) return; // در صورت تماس ورودی، اجازه اتصال از اینجا نده

  console.log('CallComponent: Initializing default WebSocket with callType:', callType);
  socketRef.current = new WebSocketService(receiverId, token, callType, (message) => {
    console.log('CallComponent: WebSocket message:', message);
    if (message.event === 'error') {
      setError(message.data.message);
      setOpenSnackbar(true);
    }
    if (message.event === 'call_incoming') {
      handleIncomingCall(message.data);
    }
    if (message.event === 'webrtc_offer') {
  const { data, from, roomID, callType } = message.data;
  handleOffer(data, from, roomID, callType); // ✅
    }
    if (message.event === 'webrtc_answer') {
      const { data, from } = message.data;
      handleAnswer(data, from);
    }
    if (message.event === 'webrtc_ice_candidate') {
      const { data, from } = message.data;
      handleIceCandidate(data, from);
    }
    if (message.event === 'call_rejected') {
      setError('تماس رد شد');
      setOpenSnackbar(true);
      onEndCall();
    }
  });

  socketRef.current.connect();

  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };
}, [receiverId, token, callType, handleOffer, handleAnswer, handleIceCandidate, handleIncomingCall, onEndCall, incomingCall]);

const startCallHandler = async () => {
  try {
    if (!socketRef.current || !socketRef.current.ws) {
      console.error("WebSocket is not ready in startCallHandler.");
      return;
    }
    if (peerConnectionsRef.current[receiverId]) {
   peerConnectionsRef.current[receiverId].close();
   delete peerConnectionsRef.current[receiverId];
 }
 if (pendingCandidatesRef.current[receiverId]) {
   delete pendingCandidatesRef.current[receiverId];
}

    const constraints = { video: isVideoCall, audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    const callData = await startCall(token, receiverId, callType, receiverType);
    const roomID = callData.roomID;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peerConnectionsRef.current[receiverId] = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [receiverId]: event.streams[0] }));
    };

   pc.onicecandidate = (event) => {
  if (event.candidate) {
    const ws = socketRef.current?.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("ICE candidate not sent: WebSocket is null or not open.");
      return;
    }

    ws.send(JSON.stringify({
      event: 'webrtc_ice_candidate',
      data: event.candidate,
      to: receiverId.toString(),
    }));
  }
};
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await waitForWebSocketOpen(socketRef.current.ws); // Optional, but safer

    socketRef.current.ws.send(JSON.stringify({
     event: 'webrtc_offer',
     data: offer,
     to: receiverId.toString(),
     roomID: roomID,
     callType: callType, 
   }));

    if (isVideoCall && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

  } catch (err) {
    console.error('startCallHandler: Error:', err);
    setError(`خطا در شروع تماس: ${err.message}`);
    setOpenSnackbar(true);
    setInCall(false);
  }
};

  const endCall = () => {
    clearTimeout(ringTimeoutRef.current);
    setRinging(false);
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setRemoteStreams({});
    setInCall(false);
    setIsMuted(false);
    setIsVideoOff(!isVideoCall);
    onEndCall();
    sendIfReady({
  event: 'call_ended',
  data: {},
  to: receiverId.toString(),
});
  };

  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };


  const toggleVideo = () => {
    if (!isVideoCall) return;
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  useEffect(() => {
  Object.entries(remoteStreams).forEach(([userId, stream]) => {
    const videoElement = document.getElementById(`remote-video-${userId}`);
    if (videoElement && videoElement.srcObject !== stream) {
      videoElement.srcObject = stream;
    }
  });
}, [remoteStreams]);

  return (
    <>
      {isVideoCall && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          style={{ display: 'none' }}
        />
      )}
      {!inCall && !incomingCall && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Button
            variant="contained"
            onClick={startCallHandler}
            disabled={inCall}
            startIcon={isVideoCall ? <Videocam /> : <Mic />}
          >
            شروع {isVideoCall ? 'ویدیوکال' : 'ویس‌کال'}
          </Button>
        </Box>
      )}
      <Dialog open={incomingCall !== null} onClose={rejectCall}>
        <DialogContent>
        <Typography>
              تماس ورودی از کاربر {incomingCall?.from}
             {ringing && <span> - در حال زنگ خوردن...</span>}
        </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={acceptCall} color="primary">
            قبول
          </Button>
          <Button onClick={rejectCall} color="error">
            رد
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={inCall} onClose={endCall} maxWidth="lg" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isVideoCall ? (
                <video
                  autoPlay
                  muted
                  style={{ width: '300px', border: '1px solid #ccc', display: isVideoOff ? 'none' : 'block' }}
                  ref={(el) => {
                    if (el && localVideoRef.current) {
                      el.srcObject = localVideoRef.current.srcObject;
                    }
                  }}
                />
              ) : (
                <Box sx={{ width: '300px', height: '200px', bgcolor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography>ویس‌کال</Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ mt: 1 }}>
                شما
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <IconButton onClick={toggleMute}>
                  {isMuted ? <MicOff /> : <Mic />}
                </IconButton>
                {isVideoCall && (
                  <IconButton onClick={toggleVideo}>
                    {isVideoOff ? <VideocamOff /> : <Videocam />}
                  </IconButton>
                )}
                <IconButton onClick={endCall} color="error">
                  <CallEnd />
                </IconButton>
              </Box>
            </Box>
            {Object.entries(remoteStreams).map(([userId, stream]) => (
  <Box key={userId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {isVideoCall ? (
      <video
        id={`remote-video-${userId}`}
        autoPlay
        style={{ width: '300px', border: '1px solid #ccc' }}
      />
    ) : (
      <Box sx={{ width: '300px', height: '200px', bgcolor: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>کاربر {userId}</Typography>
      </Box>
    )}
    <Typography variant="caption" sx={{ mt: 1 }}>
      کاربر {userId}
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
      <IconButton onClick={toggleMute}>
        {isMuted ? <MicOff /> : <Mic />}
      </IconButton>
      {isVideoCall && (
        <IconButton onClick={toggleVideo}>
          {isVideoOff ? <VideocamOff /> : <Videocam />}
        </IconButton>
      )}
      <IconButton onClick={endCall} color="error">
        <CallEnd />
      </IconButton>
    </Box>
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

export default CallComponent;