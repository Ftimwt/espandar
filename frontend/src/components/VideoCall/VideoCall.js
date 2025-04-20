// src/components/VideoCall.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:8080'; // آدرس سرور WebSocket

const VideoCall = ({ token, userID }) => {
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // ایجاد PeerConnection جدید
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    setPeerConnection(pc);

    // دریافت استریم ویدیو
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
        setLocalStream(stream);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });

    // ایجاد اتصال به سرور WebSocket
    socketRef.current = io(SOCKET_SERVER_URL, {
      query: { Authorization: token },
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', {
          event: 'candidate',
          data: JSON.stringify(event.candidate),
        });
      }
    };

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    // مدیریت سیگنال‌ها
    socketRef.current.on('signal', (message) => {
      switch (message.event) {
        case 'offer':
          handleOffer(message.data);
          break;
        case 'answer':
          handleAnswer(message.data);
          break;
        case 'candidate':
          handleCandidate(message.data);
          break;
        default:
          break;
      }
    });

    return () => {
      pc.close();
      socketRef.current.disconnect();
    };
  }, [token]);

  const handleOffer = useCallback((offer) => {
    const desc = new RTCSessionDescription(JSON.parse(offer));
    peerConnection.setRemoteDescription(desc)
      .then(() => peerConnection.createAnswer())
      .then((answer) => {
        return peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        socketRef.current.emit('signal', {
          event: 'answer',
          data: JSON.stringify(peerConnection.localDescription),
        });
      })
      .catch((error) => {
        console.error("Error handling offer:", error);
      });
  }, [peerConnection]);

  const handleAnswer = useCallback((answer) => {
    const desc = new RTCSessionDescription(JSON.parse(answer));
    peerConnection.setRemoteDescription(desc).catch((error) => {
      console.error("Error handling answer:", error);
    });
  }, [peerConnection]);

  const handleCandidate = useCallback((candidate) => {
    const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
    peerConnection.addIceCandidate(iceCandidate).catch((error) => {
      console.error("Error adding ICE candidate:", error);
    });
  }, [peerConnection]);

  const startCall = (otherUserID) => {
    peerConnection.createOffer()
      .then((offer) => {
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => {
        socketRef.current.emit('signal', {
          event: 'offer',
          data: JSON.stringify(peerConnection.localDescription),
          userID: otherUserID,
        });
      })
      .catch((error) => {
        console.error("Error starting call:", error);
      });
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    peerConnection.close();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return (
    <div>
      <h2>Video Call</h2>
      <video ref={localVideoRef} autoPlay muted style={{ width: '400px' }} />
      <video ref={remoteVideoRef} autoPlay style={{ width: '400px' }} />
      <div>
        <button onClick={() => startCall(/* ID کاربر دیگر */)}>Start Call</button>
        <button onClick={endCall}>End Call</button>
        <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleVideo}>{isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}</button>
      </div>
    </div>
  );
};

export default VideoCall;