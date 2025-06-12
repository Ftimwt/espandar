import {useEffect, useRef} from 'react';

const PeerVideo = ({stream}: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <div>
    <video ref={videoRef} autoPlay playsInline className="rounded-xl border w-full"/>
  </div>;
};

export default PeerVideo;
