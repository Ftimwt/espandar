import { useEffect, useRef, useState } from 'react';
import { useUserStore } from '../store/userStore.ts';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const useWebRTC = (wsUrl: string, localStream: MediaStream | null) => {
  const [remoteStreams, setRemoteStreams] = useState<readonly MediaStream[]>([]);
  const [startStream, setStartStream] = useState<((stream: MediaStream) => Promise<void>) | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const { user: currentUser } = useUserStore();

  useEffect(() => {
    if (!wsUrl || ws.current) return;

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    let pc: RTCPeerConnection;

    socket.onopen = () => {
      pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams(event.streams);
      };

      socket.onmessage = async (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (!pc) return;

          if (data.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'answer', answer, user: currentUser?.id }));
          } else if (data.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } else if (data.type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (e) {
          console.error('[WebRTC] Error handling message:', e);
        }
      };

      setStartStream(() => async (stream: MediaStream) => {
        if (!(stream instanceof MediaStream)) {
          console.warn('[WebRTC] Invalid stream passed to startStream');
          return;
        }

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'offer', offer, user: currentUser?.id }));
          } else {
            console.warn('[WebRTC] WebSocket not open while sending offer');
          }
        } catch (err) {
          console.error('[WebRTC] Failed to create/send offer:', err);
        }
      });
    };

    socket.onerror = (err) => {
      console.error('[WebRTC] WebSocket error:', err);
    };

    socket.onclose = () => {
      console.warn('[WebRTC] WebSocket closed');
    };

    return () => {
      socket.close();
      peerConnection.current?.close();
      ws.current = null;
    };
  }, [wsUrl]);

  return { remoteStreams, startStream };
};
