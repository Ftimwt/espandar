import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Dialog, DialogContent, DialogActions, Typography, Snackbar, IconButton } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff, CallEnd } from '@mui/icons-material';
import WebSocketService from '../../services/WebSocketService';
import { startCall, joinCall } from '../../api';

const CallComponent = ({ receiverId, token, callType = 'video', onEndCall, userId }) => {
  const isVideoCall = callType === 'video';
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideoCall);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);

  const handleOffer = useCallback(async (offer, from, roomID) => {
    try {
      console.log('handleOffer: Received offer from:', from, 'offer:', offer, 'roomID:', roomID);
      if (!from) {
        setError('خطا: شناسه فرستنده نامشخص');
        setOpenSnackbar(true);
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionsRef.current[from] = pc;

      const constraints = { video: isVideoCall, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('handleOffer: Got local stream:', stream);
      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        console.log('handleOffer: Received remote stream from:', from);
        setRemoteStreams((prev) => ({ ...prev, [from]: event.streams[0] }));
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('handleOffer: Sending ICE candidate to:', from);
          socketRef.current.send({
            event: 'webrtc_ice_candidate',
            data: event.candidate,
            to: from,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('handleOffer: Sending answer to:', from);
      socketRef.current.send({
        event: 'webrtc_answer',
        data: answer,
        to: from,
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
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('handleIceCandidate: Error:', err);
      setError('خطا در پردازش ICE candidate');
      setOpenSnackbar(true);
    }
  }, []);

  const handleIncomingCall = useCallback((data) => {
    console.log('handleIncomingCall: Incoming call:', data);
    setIncomingCall(data);
  }, []);

  const acceptCall = async () => {
    try {
      const joinData = await joinCall(token, {
        roomID: incomingCall.roomID,
        callType: incomingCall.callType,
      });
      console.log('acceptCall: joinCall response:', joinData);
      setInCall(true);
      socketRef.current.send({
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

  const rejectCall = () => {
    socketRef.current.send({
      event: 'call_rejected',
      data: { roomID: incomingCall.roomID },
      to: incomingCall.from,
    });
    setIncomingCall(null);
  };

  useEffect(() => {
    if (!socketRef.current) {
      console.log('CallComponent: Initializing WebSocket with callType:', callType);
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
          handleOffer(message.data, message.from, message.roomID);
        }
        if (message.event === 'webrtc_answer') {
          handleAnswer(message.data, message.from);
        }
        if (message.event === 'webrtc_ice_candidate') {
          handleIceCandidate(message.data, message.from);
        }
        if (message.event === 'call_rejected') {
          setError('تماس رد شد');
          setOpenSnackbar(true);
          onEndCall();
        }
      });
      socketRef.current.connect();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [receiverId, token, callType, handleOffer, handleAnswer, handleIceCandidate, handleIncomingCall, onEndCall]);

  const startCallHandler = async () => {
    try {
      const constraints = { video: isVideoCall, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const callData = await startCall(token, receiverId, callType);
      console.log('CallComponent: Call started, data:', callData);
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
          socketRef.current.send({
            event: 'webrtc_ice_candidate',
            data: event.candidate,
            to: receiverId.toString(),
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Sending offer to:', receiverId, 'roomID:', roomID);
      socketRef.current.send({
        event: 'webrtc_offer',
        data: offer,
        to: receiverId.toString(),
        roomID: roomID,
      });

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
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setRemoteStreams({});
    setInCall(false);
    setIsMuted(false);
    setIsVideoOff(!isVideoCall);
    onEndCall();
    socketRef.current.send({
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
          <Typography>تماس ورودی از کاربر {incomingCall?.from}</Typography>
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
                    autoPlay
                    ref={(el) => el && (el.srcObject = stream)}
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