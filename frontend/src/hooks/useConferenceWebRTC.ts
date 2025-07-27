import { useEffect, useRef, useState } from 'react';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

type SignalMessage =
  | { type: 'join'; userId: string }
  | { type: 'offer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; from: string; to: string; candidate: RTCIceCandidate };

const useConferenceWebRTC = (roomId: string, currentUserId: string) => {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);

  const sendMessage = (msg: SignalMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  };

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'ice-candidate',
          from: currentUserId,
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams(prev => {
        const existing = prev[peerId] || new MediaStream();
        event.streams[0].getTracks().forEach(track => existing.addTrack(track));
        return { ...prev, [peerId]: existing };
      });
    };

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    peerConnections.current.set(peerId, pc);
    return pc;
  };

  useEffect(() => {
    const connect = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);

      const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/webrtc/${roomId}`);
      socketRef.current = ws;

      ws.onopen = () => {
        sendMessage({ type: 'join', userId: currentUserId });
      };

      ws.onmessage = async (e) => {
        const msg: SignalMessage = JSON.parse(e.data);

        if (!localStream) return;

        if (msg.type === 'join' && msg.userId !== currentUserId) {
          const pc = createPeerConnection(msg.userId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          sendMessage({
            type: 'offer',
            from: currentUserId,
            to: msg.userId,
            sdp: offer,
          });
        }

        if (msg.type === 'offer' && msg.to === currentUserId) {
          const pc = createPeerConnection(msg.from);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendMessage({
            type: 'answer',
            from: currentUserId,
            to: msg.from,
            sdp: answer,
          });
        }

        if (msg.type === 'answer' && msg.to === currentUserId) {
          const pc = peerConnections.current.get(msg.from);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          }
        }

        if (msg.type === 'ice-candidate' && msg.to === currentUserId) {
          const pc = peerConnections.current.get(msg.from);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          }
        }
      };
    };

    connect();

    return () => {
      socketRef.current?.close();
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
    };
  }, [roomId]);

  return { localStream, remoteStreams };
};

export default useConferenceWebRTC;
