import {useEffect, useRef, useState} from 'react';
import {Spin} from 'antd';
import PeerVideo from './PeerVideo';
import {useWebRTC} from '../../hooks/useWebRTC.ts.tsx';

const VideoCall = ({userID, targetID}: { targetID: number, userID: number }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const url = import.meta.env.VITE_API_PREFIX.replace('http://', 'ws://').replace(
    'https://',
    'wss://',
  );

  //
  const {
    remoteStreams,
    startStream
  } = useWebRTC(url + `/ws/webrtc/${[userID, targetID].sort().join('-')}`, localStream);


  useEffect(() => {
    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      startStream?.(stream);
      setLocalStream(stream);

      setLoading(false);
    };
    start();
  }, [startStream]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {loading ? (
        <Spin tip="Connecting..."/>
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
              <PeerVideo key={i} stream={stream}/>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCall;
