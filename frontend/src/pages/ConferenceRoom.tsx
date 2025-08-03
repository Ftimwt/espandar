import React, {useEffect, useMemo, useRef, useState} from 'react';
import Swal from 'sweetalert2';
import {useUserStore} from "../store/userStore.ts";

const RoomWebsocketAddr = 'ws://localhost:8080/ws'; // ← جایگزین کن

const VideoRoom: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const {user: userNullable} = useUserStore();
  const user = userNullable!;
  const peersContainerRef = useRef<HTMLDivElement>(null);
  const hasConnectedRef = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  const servers = useMemo(() => ({
    iceServers: [{urls: 'stun:' + window.location.hostname + ':3478'}],
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

      const el = document.createElement<"video">(tagName);
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
      video: {width: 1280, height: 720},
      audio: {sampleSize: 16, channelCount: 2, echoCancellation: true},
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">💬 Video Room</h2>
      <video ref={localVideoRef} autoPlay muted playsInline className="rounded border w-1/2 mb-4"/>
      <div ref={peersContainerRef} id="videos" className="grid grid-cols-2 gap-4"/>

      <div className="flex gap-4">
        <button
          onClick={toggleMic}
          className={`px-4 py-2 rounded text-white ${micOn ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {micOn ? 'قطع میکروفون' : 'وصل میکروفون'}
        </button>
        <button
          onClick={toggleVideo}
          className={`px-4 py-2 rounded text-white ${videoOn ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {videoOn ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}
        </button>
      </div>
    </div>
  );
};

export default VideoRoom;