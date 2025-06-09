// src/components/VideoCall/PeerVideo.tsx
import React, { useEffect, useRef } from 'react';

const PeerVideo = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline className="rounded-xl border w-full" />;
};

export default PeerVideo;
