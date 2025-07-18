import { useMemo, useRef, useState } from 'react';
import PeerVideo from './PeerVideo';
import { Button, Typography } from 'antd';

const VideoCall = ({ userID, targetID }: { targetID: number; userID: number }) => {
  const localStream = useRef<MediaStream>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream[]>([]);
  const peerConnection = useRef<RTCPeerConnection>(null);

  const socket = useRef<WebSocket>(null);

  const localVideo = useRef<HTMLVideoElement>(null);

  const [isInitiator, setInitiator] = useState<boolean>(false);
  const [isLoading, setLoading] = useState<boolean>(false);

  // todo: move to env
  const servers = useMemo(
    () => ({
      iceServers: [{ urls: 'stun:' + window.location.hostname + ':3478' }],
    }),
    [],
  );

  console.log(servers);

  const [status, updateStatus] = useState<string>('');

  const startCall = async () => {
    try {
      updateStatus('Getting camera and microphone...');

      localStream.current = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        // audio: true,
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
        // 'ws://' + window.location.host + '/ws?room=' + roomId + '&user=' + userId,
        'ws://localhost:8080/ws/peer?room=' +
          [userID, targetID].sort().join('-') +
          '&user=' +
          userID,
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
            // if (remoteVideo.srcObject) {
            //   remoteVideo.srcObject = null;
            // }
            break;
        }
      };

      socket.current.onerror = (error) => {
        updateStatus('Socket error: ' + error);
      };

      // startBtn.disabled = true;
      // endBtn.disabled = false;
      // muteBtn.disabled = false;
      // videoBtn.disabled = false;
    } catch (error) {
      updateStatus('Error: ' + error);
      console.error('Error initializing connection:', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Typography>{status}</Typography>
      {isLoading ? (
        <div className="text-center text-lg">⏳ در حال اتصال تماس...</div>
      ) : (
        <>
          <video ref={localVideo} autoPlay playsInline muted className="rounded-xl w-1/2 border" />
          <div className="grid grid-cols-2 gap-4 w-full">
            <Typography>Clients</Typography>
            {mediaStream?.map((stream, i) => <PeerVideo key={i} stream={stream} />)}
          </div>
        </>
      )}
      <Button onClick={startCall}>Start call</Button>
    </div>
  );
};

export default VideoCall;
