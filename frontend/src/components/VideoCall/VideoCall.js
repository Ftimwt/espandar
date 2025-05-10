import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Dialog, DialogContent, Typography, Snackbar } from '@mui/material';
import { Mic, MicOff, Videocam, VideocamOff } from '@mui/icons-material';
import WebSocketService from '../../services/WebSocketService';

const VideoCall = ({ receiverId, token }) => {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = new WebSocketService(receiverId, token, (message) => {
      if (message.event === 'webrtc_offer') handleOffer(message.data, message.from);
      if (message.event === 'webrtc_answer') handleAnswer(message.data, message.from);
      if (message.event === 'webrtc_ice_candidate') handleIceCandidate(message.data, message.from);
    });

    return () => socketRef.current.disconnect();
  }, [receiverId, token]);

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!localVideoRef.current) throw new Error('Video element not found');
      localVideoRef.current.srcObject = stream;

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
      socketRef.current.send({
        event: 'webrtc_offer',
        data: offer,
        to: receiverId.toString(),
      });
      setInCall(true);
    } catch (err) {
      setError(`خطا در دسترسی: ${err.message}`);
      setOpenSnackbar(true);
      setInCall(false);
    }
  };

  const handleOffer = async (offer, from) => {
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
  };const handleIceCandidate = async (candidate, from) => {
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
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setRemoteStreams({});
    setInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const toggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTrack = localVideoRef.current.srcObject.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTrack = localVideoRef.current.srcObject.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  return (
    <>
      <Box sx={{ p: 2 }}>
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
      </Box>
      <Dialog open={inCall} onClose={endVideoCall} maxWidth="lg" fullWidth>
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

export default VideoCall;