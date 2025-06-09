// src/hooks/useWebRTC.ts
import { useEffect, useRef, useState } from 'react';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const useWebRTC = (wsUrl: string, localStream: MediaStream | null) => {
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!localStream) return;

    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach((track) => {
      peerConnection.current!.addTrack(track, localStream);
    });

    peerConnection.current.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((prev) => {
        if (prev.find((s) => s.id === stream.id)) return prev;
        return [...prev, stream];
      });
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current?.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
      }
    };

    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'offer') {
        await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.current!.createAnswer();
        await peerConnection.current!.setLocalDescription(answer);
        ws.current!.send(JSON.stringify({ type: 'answer', answer }));
      } else if (data.type === 'answer') {
        await peerConnection.current!.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === 'ice') {
        await peerConnection.current!.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    return () => {
      peerConnection.current?.close();
      ws.current?.close();
    };
  }, [localStream, wsUrl]);

  const createOffer = async () => {
    const offer = await peerConnection.current!.createOffer();
    await peerConnection.current!.setLocalDescription(offer);
    ws.current?.send(JSON.stringify({ type: 'offer', offer }));
  };

  return { remoteStreams, createOffer };
};
