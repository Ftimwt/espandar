import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Dialog, DialogContent, Typography, Snackbar } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff } from '@mui/icons-material';
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
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);

  const handleOffer = useCallback(async (offer, from, roomID) => {
    try {
      console.log('handleOffer: Received offer from:', from, 'offer:', offer, 'roomID:', roomID);
      if (!from) {
        console.error('handleOffer: No from field provided');
        setError('خطا: شناسه فرستنده نامشخص');
        setOpenSnackbar(true);
        return;
      }

      const joinData = await joinCall(token, {
        roomID: roomID,
        callType,
      });
      console.log('handleOffer: joinCall response:', joinData);

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
      console.log('handleOffer: Set remote description');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('handleOffer: Sending answer to:', from);
      socketRef.current.send({
        event: 'webrtc_answer',
        data: answer,
        to: from,
      });
      setInCall(true);
    } catch (err) {
      console.error('handleOffer: Error:', err);
      setError(`خطا در پردازش پیشنهاد تماس: ${err.message}`);
      setOpenSnackbar(true);
    }
  }, [isVideoCall, token, callType]);

  const handleAnswer = useCallback(async (answer, from) => {
    try {
      console.log('handleAnswer: Received answer from:', from);
      const pc = peerConnectionsRef.current[from];
      if (!pc) {
        throw new Error(`No peer connection found for user ${from}`);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error in handleAnswer:', err);
      setError('خطا در پردازش پاسخ تماس');
      setOpenSnackbar(true);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate, from) => {
    try {
      const pc = peerConnectionsRef.current[from];
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error in handleIceCandidate:', err);
      setError('خطا در پردازش ICE candidate');
      setOpenSnackbar(true);
    }
  }, []);

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
          console.log('CallComponent: incoming call:', message.data);
          handleIncomingCall(message.data); // اصلاح نام تابع
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
      });
      socketRef.current.connect();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [receiverId, token, callType, handleOffer, handleAnswer, handleIceCandidate]);

  const handleIncomingCall = async (data) => {
    try {
      console.log('handleIncomingCall: Joining call:', data);
      const joinData = await joinCall(token, {
        roomID: data.roomID,
        callType: data.callType,
      });
      console.log('handleIncomingCall: joinCall response:', joinData);
      setInCall(true);
    } catch (err) {
      console.error('handleIncomingCall: Error:', err);
      setError(`خطا در پیوستن به تماس: ${err.message}`);
      setOpenSnackbar(true);
    }
  };

  const startCallHandler = async () => {
    try {
      console.log('startCall type:', typeof startCall);
      if (typeof startCall !== 'function') {
        throw new Error('startCall is not a function');
      }
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
      setInCall(true);

      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      } else if (!isVideoCall) {
        console.log('Voice call: No video element required');
      } else {
        console.warn('Video call: localVideoRef.current is null');
      }
    } catch (err) {
      console.error('Error in startCallHandler:', err);
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
      {!inCall && (
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
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
            <Button
              onClick={toggleMute}
              startIcon={isMuted ? <MicOff /> : <Mic />}
            >
              {isMuted ? 'فعال کردن صدا' : 'قطع صدا'}
            </Button>
            {isVideoCall && (
              <Button
                onClick={toggleVideo}
                startIcon={isVideoOff ? <VideocamOff /> : <Videocam />}
              >
                {isVideoOff ? 'فعال کردن ویدیو' : 'قطع ویدیو'}
              </Button>
            )}
            <Button variant="contained" color="error" onClick={endCall}>
              پایان تماس
            </Button>
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