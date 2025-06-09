import { useEffect, useRef, useState } from 'react';
import { Button, Spin } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';
import PeerVideo from './PeerVideo';
import { useWebRTC } from '../../hooks/useWebRTC.ts.tsx';

const VideoCall = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const url = import.meta.env.VITE_API_PREFIX.replace('http://', 'ws://').replace(
    'https://',
    'wss://',
  );

  const { remoteStreams, createOffer } = useWebRTC(url + '/ws', localStream);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    });
  }, []);

  useEffect(() => {
    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // WebRTC setup will go here (peer connection, signaling, etc.)
      // setRemoteStreams([...]);

      setLoading(false);
    };
    start();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {loading ? (
        <Spin tip="Connecting..." />
      ) : (
        <>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="rounded-xl w-1/2 border"
          />
          <div className="grid grid-cols-2 gap-4 w-full">
            {remoteStreams.map((stream, i) => (
              <PeerVideo key={i} stream={stream} />
            ))}
          </div>
        </>
      )}
      <Button onClick={createOffer}>Start Call</Button>

      <Button type="primary" icon={<VideoCameraOutlined />}>
        Leave Call
      </Button>
    </div>
  );
};

export default VideoCall;
