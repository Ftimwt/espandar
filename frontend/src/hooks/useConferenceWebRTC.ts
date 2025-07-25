import { useEffect, useRef, useState } from 'react';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const useConferenceWebRTC = () => {
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const joinConference = async (
  conferenceID: string,
  localVideoRef: React.RefObject<HTMLVideoElement | null> 
) => {
    wsRef.current = new WebSocket(`ws://localhost:8080/ws/webrtc/${conferenceID}`);

    wsRef.current.onopen = () => {
  console.log("✅ WebSocket connected");
  wsRef.current?.send(JSON.stringify({ type: "join", user: "me" }));
};

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setLocalStream(stream);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams((prev) => {
          const exists = prev.find((s) => s.id === event.streams[0].id);
          if (!exists) return [...prev, event.streams[0]];
          return prev;
        });
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      }
    };

    wsRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (!pc) return;

      if (data.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify({ type: 'answer', answer }));
      } else if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };
  };

  const leaveConference = () => {
    pcRef.current?.close();
    wsRef.current?.close();
    setRemoteStreams([]);
    localStream?.getTracks().forEach((track) => track.stop());
  };

  const shareScreen = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    stream.getTracks().forEach((track) => {
      pcRef.current?.addTrack(track, stream);
    });
  };

  useEffect(() => {
    return () => {
      leaveConference();
    };
  }, []);

  return { remoteStreams, joinConference, leaveConference, shareScreen, localStream };
};

export default useConferenceWebRTC;
