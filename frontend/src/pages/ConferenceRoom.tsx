import { useParams } from 'react-router';
import { useEffect, useState, useRef } from 'react';
import { Button, message } from 'antd';
import useConferenceWebRTC from '../hooks/useConferenceWebRTC';
import axios from 'axios';
import { useUserStore } from '../store/userStore'; // برای userId

const ConferenceRoom = () => {
  const { conferenceID } = useParams();
  const [conference, setConference] = useState<any>(null);
  const [notStarted, setNotStarted] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUserStore(); // گرفتن userId از store

  if (!user) {
  return <div>Loading user...</div>;
}
  const { localStream, remoteStreams } = useConferenceWebRTC(conferenceID!, user.id.toString());

  // گرفتن اطلاعات کنفرانس و بررسی زمان شروع
  useEffect(() => {
    const fetchConference = async () => {
      try {
        const res = await axios.get(`/conference/${conferenceID}`);
        const conf = res.data.conference;
        setConference(conf);

        const now = new Date();
        const scheduled = new Date(conf.scheduledAt);
        if (scheduled > now) {
          setNotStarted(true);
        }
      } catch (err) {
        message.error("Failed to load conference info.");
      }
    };

    fetchConference();
  }, [conferenceID]);

  // اتصال استریم محلی
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (notStarted) {
    return (
      <div style={{ padding: 20 }}>
        <h2>⏳ This conference has not started yet.</h2>
        <p>Please come back at: <b>{conference?.scheduledAt}</b></p>
      </div>
    );
  }

  return (
    <div>
      <h2>Conference Room {conference?.title || conferenceID}</h2>

      {/* نمایش تصویر خودت */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        style={{ width: '300px', border: '2px solid green', margin: 10 }}
      />

      {/* نمایش دیگران */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {Object.entries(remoteStreams).map(([peerId, stream]) => {
          const ref = useRef<HTMLVideoElement>(null);

          useEffect(() => {
            if (ref.current) {
              ref.current.srcObject = stream;
            }
          }, [stream]);

          return (
            <video
              key={peerId}
              ref={ref}
              autoPlay
              style={{ width: '300px', border: '2px solid blue', margin: 10 }}
            />
          );
        })}
      </div>

      <Button onClick={() => {
        navigator.mediaDevices.getDisplayMedia({ video: true }).then((screenStream) => {
          const track = screenStream.getVideoTracks()[0];
          localStream?.getVideoTracks().forEach(t => t.stop());
          localStream?.removeTrack(localStream.getVideoTracks()[0]);
          localStream?.addTrack(track);
        });
      }}>
        Share Screen
      </Button>
    </div>
  );
};

export default ConferenceRoom;
