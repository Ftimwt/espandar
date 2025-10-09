import React, { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { useUserStore } from "../store/userStore.ts";
import { Button, Tooltip, Flex } from 'antd';
import {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  DesktopOutlined,
  PhoneOutlined,
} from '@ant-design/icons';


const VideoRoom: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { user: userNullable } = useUserStore();
  const user = userNullable!;
  const peersContainerRef = useRef<HTMLDivElement>(null);
  const hasConnectedRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const servers = useMemo(() => ({
    iceServers: [{ urls: 'stun:' + window.location.hostname + ':3478' }],
  }), []);

  const connect = async (mediaStream: MediaStream) => {
    if (!peersContainerRef.current) return;

    const pc = new RTCPeerConnection(servers);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      let tagName = event.track.kind;
      if (tagName !== 'video' && tagName !== 'audio') return;
      if (tagName === 'audio') return;

      const videoContainer = document.createElement('div');
      videoContainer.className = 'peer';

      const el = document.createElement(tagName) as HTMLVideoElement;
      el.srcObject = event.streams[0];
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;

      videoContainer.appendChild(el);
      peersContainerRef.current?.appendChild(videoContainer);

      event.track.onmute = () => el.play();

      event.streams[0].onremovetrack = () => {
        videoContainer.remove();
      };
    };

    mediaStream.getTracks().forEach((track) => {
      pc.addTrack(track, mediaStream);
    });

    const room = "hello";
    const ws = new WebSocket(`ws://localhost:8080/room/${room}/websocket`);
    wsRef.current = ws;

    ws.onmessage = async (e) => {
      const msg = JSON.parse(e.data);
      if (!msg) return console.warn('message parse failed');

      switch (msg.event) {
        case 'offer':
          const offer = JSON.parse(msg.data);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({
            event: 'answer',
            data: JSON.stringify(answer),
          }));
          break;

        case 'candidate':
          const candidate = JSON.parse(msg.data);
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          break;
      }
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      pc.close();
      pcRef.current = null;
      if (peersContainerRef.current) {
        peersContainerRef.current.innerHTML = '';
      }
      setTimeout(() => connect(mediaStream), 1000);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(JSON.stringify({
          event: 'candidate',
          data: JSON.stringify(e.candidate),
        }));
      }
    };
  };

  useEffect(() => {
    if (hasConnectedRef.current) return;
    hasConnectedRef.current = true;
    navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: { sampleSize: 16, channelCount: 2, echoCancellation: true },
    }).then((mediaStream) => {
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
      connect(mediaStream);
    }).catch((err) => {
      console.error('getUserMedia error:', err);
      Swal.fire({
        icon: 'error',
        title: 'دسترسی به دوربین یا میکروفون رد شد',
        text: err.message,
      });
    });
  }, []);

  const toggleMic = () => {
    if (!stream) return;
    const enabled = !micOn;
    stream.getAudioTracks().forEach((track) => (track.enabled = enabled));
    setMicOn(enabled);
  };

  const toggleVideo = () => {
    if (!stream) return;
    const enabled = !videoOn;
    stream.getVideoTracks().forEach((track) => (track.enabled = enabled));
    setVideoOn(enabled);
  };

  const handleLeaveConference = () => {
    wsRef.current?.close();
    pcRef.current?.close();
    window.location.href = '/';
  };

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
      sender?.replaceTrack(screenTrack);

      screenTrack.onended = () => {
        const videoTrack = stream?.getVideoTracks()[0];
        if (videoTrack) {
          sender?.replaceTrack(videoTrack);
        }
      };
    } catch (err: any) {
      console.error('Screen share error:', err);
      Swal.fire('خطا در اشتراک‌گذاری صفحه', err.message, 'error');
    }
  };

  return (
  <div className="p-4">
    <h2 className="text-xl font-bold">💬 Video Room</h2>

    <video
      ref={localVideoRef}
      autoPlay
      muted
      playsInline
      className="rounded border w-1/2 mb-4"
    />

    <div
      ref={peersContainerRef}
      id="videos"
      className="grid grid-cols-2 gap-4"
    />

    <div className="mt-6">
      <Flex gap={10} justify="center" align="center">
        <Tooltip title={micOn ? 'Mute' : 'Unmute'}>
          <Button
            aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            shape="circle"
            size="large"
            danger={!micOn}
            icon={micOn ? <AudioOutlined /> : <AudioMutedOutlined />}
            onClick={toggleMic}
          />
        </Tooltip>

        <Tooltip title={videoOn ? 'Turn off camera' : 'Turn on camera'}>
          <Button
            aria-label={videoOn ? 'Turn off camera' : 'Turn on camera'}
            shape="circle"
            size="large"
            danger={!videoOn}
            icon={<VideoCameraOutlined />}
            onClick={toggleVideo}
          />
        </Tooltip>

        <Tooltip title="Share screen">
          <Button
            aria-label="Share screen"
            shape="circle"
            size="large"
            icon={<DesktopOutlined />}
            onClick={handleScreenShare}
          />
        </Tooltip>

        <Tooltip title="Leave conference">
          <Button
            aria-label="Leave conference"
            type="primary"
            danger
            shape="circle"
            size="large"
            icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
            onClick={handleLeaveConference}
          />
        </Tooltip>
      </Flex>
    </div>
  </div>
  );
};

export default VideoRoom;
