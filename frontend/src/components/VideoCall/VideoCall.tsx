import { useEffect, useMemo, useRef, useState } from 'react';
import PeerVideo from './PeerVideo';
import { Button, Flex } from 'antd';
import { userCallStore } from '../../store/callStore.ts';
import { useUserStore } from '../../store/userStore.ts';
import {
  AudioMutedOutlined,
  AudioOutlined,
  PhoneOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';

const VideoCall = () => {
  const { room, cancelCall } = userCallStore();
  const { user } = useUserStore();

  const localStream = useRef<MediaStream>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream[]>([]);
  const peerConnection = useRef<RTCPeerConnection>(null);

  const socket = useRef<WebSocket>(null);

  const localVideo = useRef<HTMLVideoElement>(null);

  const [isInitiator, setInitiator] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);

  const [videoOn, setVideoOn] = useState<boolean>(true);
  const [micOn, setMicOn] = useState<boolean>(true);

  const hasRun = useRef(false);

  // todo: move to env
  const servers = useMemo(
    () => ({
      iceServers: [{ urls: 'stun:' + window.location.hostname + ':3478' }],
    }),
    [],
  );

  const [_status, updateStatus] = useState<string>('');

  const startCall = async () => {
    console.log('starting call...');
    try {
      updateStatus('Getting camera and microphone...');

      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      if (localVideo.current) {
        localVideo.current.srcObject = localStream.current;
      }
      updateStatus('Local media ready');

      // Create peer connection
      peerConnection.current = new RTCPeerConnection(servers);

      // Add local stream to peer connection
      localStream.current.getTracks().forEach((track) => {
        if (!localStream.current) return;
        peerConnection.current?.addTrack(track, localStream.current);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        updateStatus('Remote stream received');
        setMediaStream(event.streams as []);
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current?.send(
            JSON.stringify({
              type: 'ice-candidate',
              content: event.candidate,
            }),
          );
        }
      };

      // Connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        updateStatus('Connection state: ' + peerConnection.current?.connectionState);
      };

      // Connect to signaling server
      updateStatus('Connecting to signaling server...');
      socket.current = new WebSocket(
        //  todo move to env
        `ws://localhost:8080/ws/peer?room=${room}&user=${user?.id}`,
      );

      socket.current.onopen = () => {
        updateStatus('Connected to signaling server');
      };

      socket.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'room-info':
            updateStatus(message.content);
            break;

          case 'offer':
            updateStatus('Received offer, creating answer...');
            await peerConnection.current?.setRemoteDescription(message.content);
            const answer = await peerConnection.current?.createAnswer();
            await peerConnection.current?.setLocalDescription(answer);
            socket.current?.send(
              JSON.stringify({
                type: 'answer',
                content: answer,
              }),
            );
            break;

          case 'answer':
            updateStatus('Received answer, establishing connection...');
            await peerConnection.current?.setRemoteDescription(message.content);
            break;

          case 'ice-candidate':
            await peerConnection.current?.addIceCandidate(message.content);
            break;

          case 'user-joined':
            updateStatus('User joined: ' + message.content);
            if (!isInitiator) {
              setInitiator(isInitiator);
              // Create offer for new user
              const offer = await peerConnection.current?.createOffer();
              await peerConnection.current?.setLocalDescription(offer);
              socket.current?.send(
                JSON.stringify({
                  type: 'offer',
                  content: offer,
                }),
              );
              updateStatus('Sent offer to new user');
            }
            break;

          case 'user-left':
            updateStatus('User left: ' + message.content);
            // todo: handle user left
            setMediaStream([]);
            break;
        }
      };

      socket.current.onerror = (error) => {
        updateStatus('Socket error: ' + error);
      };

      setLoading(false);
    } catch (error) {
      updateStatus('Error: ' + error);
      console.error('Error initializing connection:', error);
    }
  };

  const endCall = () => {
    console.log('ending call');
    if (peerConnection.current) peerConnection.current.close();
    if (socket.current) socket.current.close();
    cancelCall();
    hasRun.current = false;
    localStream.current?.getTracks().forEach((track) => track.stop());
  };

  useEffect(() => {
    if (hasRun.current) {
      return;
    }
    hasRun.current = true;
    startCall().then();
  }, []);

  function muteToggle() {
    setMicOn((prev) => {
      localStream.current?.getAudioTracks().forEach((track) => {
        track.enabled = !prev;
      });
      return !prev;
    });
  }

  function videoOffToggle() {
    setVideoOn((prev) => {
      localStream.current?.getVideoTracks().forEach((track) => {
        track.enabled = !prev;
      });
      return !prev;
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {isLoading ? (
        <div className="text-center text-lg">⏳ در حال اتصال تماس...</div>
      ) : (
        <>
          <video ref={localVideo} autoPlay playsInline muted className="rounded-xl w-1/2 border" />
          <div className="grid grid-cols-2 gap-4 w-full">
            {mediaStream?.map((stream, i) => <PeerVideo key={i} stream={stream} />)}
          </div>
        </>
      )}
      <Flex gap={10}>
        <Button
          type="primary"
          danger
          shape="circle"
          icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
          onClick={endCall}
        />
        <Button
          icon={micOn ? <AudioMutedOutlined /> : <AudioOutlined />}
          danger={!micOn}
          shape="circle"
          onClick={muteToggle}
        />
        <Button
          icon={micOn ? <VideoCameraOutlined /> : <VideoCameraOutlined />}
          danger={!videoOn}
          shape="circle"
          onClick={videoOffToggle}
        />
      </Flex>
    </div>
  );
};

export default VideoCall;
