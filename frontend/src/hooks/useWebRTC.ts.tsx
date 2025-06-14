// src/hooks/useWebRTC.ts
import {useEffect, useRef, useState} from 'react';
import {useUserStore} from "../store/userStore.ts";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
};

export const useWebRTC = (wsUrl: string, localStream: MediaStream | null) => {
  const [remoteStreams, setRemoteStreams] = useState<readonly MediaStream[]>([]);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  // const currentUserID = Number(uuid);
  const ws = useRef<WebSocket | null>(null);
  const [_isOffer, setIsOffer] = useState(false);
  const [startStream, setStartStream] = useState<(stream: MediaStream) => Promise<void>>();
  const {user: currentUser} = useUserStore();


  useEffect(() => {
    if (!localStream) return;

    ws.current = new WebSocket(wsUrl);
    peerConnection.current = new RTCPeerConnection(ICE_SERVERS);
    localStream.getTracks().forEach((track) => {
      peerConnection.current?.addTrack(track, localStream);
    });
    peerConnection.current.onicecandidate = event => {
      if (event.candidate) {
        ws.current?.send(JSON.stringify({type: "candidate", candidate: event.candidate}));
      }
    };

    peerConnection.current.ontrack = event => {
      setRemoteStreams(event.streams);
    };


    ws.current.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);
      console.log(data);
      if (data.type === "offer") {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnection.current?.createAnswer();
        await peerConnection.current?.setLocalDescription(answer);
        ws.current?.send(JSON.stringify({type: "answer", answer, user: currentUser?.id}));
      } else if (data.type === "answer") {
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      } else if (data.type === "candidate") {
        await peerConnection.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    setStartStream(async (stream: MediaStream) => {
      stream?.getTracks()?.forEach(track => peerConnection.current?.addTrack(track, stream));
      setIsOffer(true);
      peerConnection.current?.createOffer().then((offer: any) => {
        peerConnection.current?.setLocalDescription(offer);
        ws.current?.send(JSON.stringify({type: "offer", offer, user: currentUser?.id}));
      });
    })

  }, [localStream, wsUrl]);

  return {remoteStreams, startStream};
};
