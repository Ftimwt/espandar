import {useEffect, useMemo, useRef, useState} from 'react';
import PeerVideo from './PeerVideo';
import {Button, Flex} from 'antd';
import {userCallStore} from "../../store/callStore.ts";
import {useUserStore} from "../../store/userStore.ts";
import {AudioMutedOutlined, AudioOutlined, PhoneOutlined, VideoCameraOutlined} from "@ant-design/icons";

const VideoCall = () => {
  const {room, cancelCall} = userCallStore();
  const {user: userNullable} = useUserStore();

  const localStream = useRef<MediaStream>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const socket = useRef<WebSocket>(null);
  const localVideo = useRef<HTMLVideoElement>(null);

  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [status, setStatus] = useState('در حال اتصال...');
  const hasRun = useRef(false);

  const user = useMemo(() => userNullable!, [userNullable]);

  const servers = useMemo(() => ({
    iceServers: [{urls: 'stun:' + window.location.hostname + ':3478'}],
  }), []);

  const createPeerConnection = (peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(servers);

    localStream.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current!);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current?.send(JSON.stringify({
          type: 'ice-candidate',
          from: user.id,
          target: peerId,
          content: event.candidate,
        }));
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({...prev, [peerId]: event.streams[0]}));
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  };

  const flushPendingCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queued = pendingCandidates.current.get(peerId);
    if (queued?.length) {
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch (e) {
          console.warn(`❌ Failed to add queued ICE for ${peerId}:`, e);
        }
      }
      pendingCandidates.current.delete(peerId);
    }
  };

  const handleSignalMessage = async (message: any) => {
    const {type, from, target, content} = message;
    console.table(message);
    if (from === user.id) return;

    const peerId = String(from);
    let pc = peerConnections.current.get(peerId);
    if (!pc) {
      pc = createPeerConnection(peerId);
    }

    switch (type) {
      case 'offer':
        if (pc.signalingState !== 'stable') {
          console.warn(`⛔️ Rejecting offer, state: ${pc.signalingState}`);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(content));
        await flushPendingCandidates(peerId, pc);
        if (pc.signalingState === 'have-remote-offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.current?.send(JSON.stringify({
            type: 'answer',
            from: user.id,
            target: peerId,
            content: answer,
          }));
        }
        break;

      case 'answer':
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(content));
          await flushPendingCandidates(peerId, pc);
        } else {
          console.warn(`⚠️ Ignoring answer, invalid state: ${pc.signalingState}`);
        }
        break;

      case 'ice-candidate':
        const ice = new RTCIceCandidate(content);
        if (!pc.remoteDescription || pc.remoteDescription.type === '') {
          const q = pendingCandidates.current.get(peerId) || [];
          q.push(ice);
          pendingCandidates.current.set(peerId, q);
        } else {
          try {
            await pc.addIceCandidate(ice);
          } catch (e) {
            console.warn(`⚠️ ICE add error for ${peerId}:`, e);
          }
        }
        break;

      case 'user-joined':
        if (from === user.id) return;

        // تعیین نقش initiator بر اساس user.id
        const isInitiator = user.id < from;

        if (isInitiator) {
          if (!pc) pc = createPeerConnection(peerId);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.current?.send(JSON.stringify({
            type: 'offer',
            from: user.id,
            target: peerId,
            content: offer,
          }));
        }
        break;

      case 'user-left':
        peerConnections.current.get(peerId)?.close();
        peerConnections.current.delete(peerId);
        pendingCandidates.current.delete(peerId);
        setRemoteStreams((prev) => {
          const copy = {...prev};
          delete copy[peerId];
          return copy;
        });
        break;
    }
  };

  const startCall = async () => {
    try {
      setStatus('🔄 گرفتن دوربین و میکروفون...');
      localStream.current = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
      if (localVideo.current) {
        localVideo.current.srcObject = localStream.current;
      }

      socket.current = new WebSocket(`ws://localhost:8080/ws/peer?room=${room}&user=${user?.id}`);

      socket.current.onopen = () => {
        setStatus('✅ اتصال به سیگنالینگ');
      };

      socket.current.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        await handleSignalMessage(msg);
      };

      socket.current.onerror = (err) => {
        console.error(err);
        setStatus('❌ خطا در اتصال');
      };
    } catch (e) {
      console.error(e);
      setStatus('❌ خطا در دریافت stream');
    }
  };

  const endCall = () => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    localStream.current?.getTracks().forEach((track) => track.stop());
    socket.current?.close();
    setRemoteStreams({});
    cancelCall();
    hasRun.current = false;
  };

  const muteToggle = () => {
    setMicOn((prev) => {
      localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !prev));
      return !prev;
    });
  };

  const videoToggle = () => {
    setVideoOn((prev) => {
      localStream.current?.getVideoTracks().forEach((t) => (t.enabled = !prev));
      return !prev;
    });
  };

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      startCall();
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div>{status}</div>
      <video ref={localVideo} autoPlay playsInline muted className="rounded-xl w-1/2 border"/>
      <div className="grid grid-cols-2 gap-4 w-full">
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <PeerVideo key={id} stream={stream}/>
        ))}
      </div>
      <Flex gap={10}>
        <Button type="primary" danger shape="circle"
                icon={<PhoneOutlined style={{transform: 'rotate(135deg)'}}/>}
                onClick={endCall}/>
        <Button icon={micOn ? <AudioOutlined/> : <AudioMutedOutlined/>}
                danger={!micOn}
                shape="circle"
                onClick={muteToggle}/>
        <Button icon={<VideoCameraOutlined/>}
                danger={!videoOn}
                shape="circle"
                onClick={videoToggle}/>
      </Flex>
    </div>
  );
};

export default VideoCall;
