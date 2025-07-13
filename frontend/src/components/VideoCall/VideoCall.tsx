import { useEffect, useRef, useState } from 'react';
import { Spin } from 'antd';
import PeerVideo from './PeerVideo';
import { useWebRTC } from '../../hooks/useWebRTC.ts.tsx';

const VideoCall = ({ userID, targetID }: { targetID: number, userID: number }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const url = import.meta.env.VITE_API_PREFIX.replace('http://', 'ws://').replace('https://', 'wss://');
  const signalingUrl = url + `/ws/webrtc/${[userID, targetID].sort().join('-')}`;
  const { remoteStreams, startStream } = useWebRTC(signalingUrl, localStream);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setLocalStream(stream);

        const waitAndStart = () => {
          if (typeof startStream === 'function') {
            startStream(stream);
            retryRef.current && clearTimeout(retryRef.current); // توقف retry
          } else {
            retryRef.current = setTimeout(waitAndStart, 200); // تا گرفتن startStream صبر کن
          }
        };

        waitAndStart();
        setLoading(false);
      } catch (err) {
        console.error('[VideoCall] Error starting media:', err);
        setLoading(false);
      }
    };

    start();

    // 👇 cleanup تایمر در خروج از کامپوننت
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [startStream]); // 👈 وابستگی تنها به startStream

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {loading ? (
        <div className="text-center text-lg">⏳ در حال اتصال تماس...</div>
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
    </div>
  );
};

export default VideoCall;
