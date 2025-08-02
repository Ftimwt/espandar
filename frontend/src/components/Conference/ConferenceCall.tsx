import { useEffect, useRef, useState } from 'react';
import PeerVideo from '../VideoCall/PeerVideo';
import { useUserStore } from '../../store/userStore';
import { Button, Flex } from 'antd';
import { PhoneOutlined, AudioMutedOutlined, AudioOutlined, VideoCameraOutlined } from '@ant-design/icons';
import {userCallStore} from "../../store/callStore.ts";

interface ConferenceCallProps {
  roomId: string;
}

const ConferenceCall: React.FC<ConferenceCallProps> = ({ roomId }) => {
  const { user } = useUserStore();
  const {} = userCallStore();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [peers, setPeers] = useState<Record<string, RTCPeerConnection>>({});
  const socket = useRef<WebSocket | null>(null);
  const [icOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  useEffect(() => {
    const start = async () => {
      localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream.current;

      socket.current = new WebSocket(`ws://localhost:8080/ws/peer?room=${roomId}&user=${user?.id}`);

      socket.current.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        const senderId = msg.userId;
        if (senderId === user?.id.toString()) return;

        switch (msg.type) {
          case 'offer': {
            const pc = createPeer(senderId);
            await pc.setRemoteDescription(new RTCSessionDescription(msg.content));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.current?.send(JSON.stringify({ type: 'answer', content: answer, userId: user?.id }));
            break;
          }
          case 'answer': {
            await peers[senderId]?.setRemoteDescription(new RTCSessionDescription(msg.content));
            break;
          }
          case 'ice-candidate': {
            await peers[senderId]?.addIceCandidate(new RTCIceCandidate(msg.content));
            break;
          }
          case 'user-joined': {
            if (peers[senderId]) return;
            const pc = createPeer(senderId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.current?.send(JSON.stringify({ type: 'offer', content: offer, userId: user?.id }));
            break;
          }
        }
      };
    };
    start();
  }, []);

  const createPeer = (id: string) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:' + window.location.hostname + ':3478' }] });
    localStream.current?.getTracks().forEach(track => pc.addTrack(track, localStream.current!));
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current?.send(JSON.stringify({ type: 'ice-candidate', content: event.candidate, userId: user?.id }));
      }
    };
    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [id]: event.streams[0] }));
    };
    setPeers(prev => ({ ...prev, [id]: pc }));
    return pc;
  };

  const endCall = () => {
    socket.current?.close();
    Object.values(peers).forEach(pc => pc.close());
    localStream.current?.getTracks().forEach(track => track.stop());
    setRemoteStreams({});
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <video ref={localVideoRef} autoPlay playsInline muted className="rounded-xl w-1/2 border" />
      <div className="grid grid-cols-2 gap-4 w-full">
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <PeerVideo key={id} stream={stream} />
        ))}
      </div>
      <Flex gap={10}>
        <Button type="primary" danger shape="circle" icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />} onClick={endCall} />
        <Button icon={micOn ? <AudioMutedOutlined /> : <AudioOutlined />} danger={!micOn} shape="circle" onClick={() => {
          setMicOn(prev => {
            localStream.current?.getAudioTracks().forEach(track => track.enabled = !prev);
            return !prev;
          });
        }} />
        <Button icon={<VideoCameraOutlined />} danger={!videoOn} shape="circle" onClick={() => {
          setVideoOn(prev => {
            localStream.current?.getVideoTracks().forEach(track => track.enabled = !prev);
            return !prev;
          });
        }} />
      </Flex>
    </div>
  );
};

export default ConferenceCall;
