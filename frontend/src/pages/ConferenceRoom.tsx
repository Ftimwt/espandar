import { useParams } from 'react-router';
import { useEffect, useState, useRef } from 'react';
import { Button, message } from 'antd';
import useConferenceWebRTC from '../hooks/useConferenceWebRTC';
import axios from 'axios';

const ConferenceRoom = () => {
  const { conferenceID } = useParams();
  const { remoteStreams, joinConference, leaveConference, shareScreen, localStream } = useConferenceWebRTC();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [conference, setConference] = useState<any>(null);
  const [notStarted, setNotStarted] = useState(false);

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
        } else {
          joinConference(conferenceID!, localVideoRef);
        }
      } catch (err) {
        message.error("Failed to load conference info.");
      }
    };

    fetchConference();
    return () => leaveConference();
  }, [conferenceID]);

  // اتصال استریم محلی
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // نمایش قبل از شروع کنفرانس
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
      <h2>Conference Room {conferenceID}</h2>
      <video ref={localVideoRef} autoPlay muted />
      <div>
        {remoteStreams.map((stream: MediaStream, idx: number) => {
          const ref = useRef<HTMLVideoElement>(null);

          useEffect(() => {
            if (ref.current) {
              ref.current.srcObject = stream;
            }
          }, [stream]);

          return <video key={idx} ref={ref} autoPlay />;
        })}
      </div>
      <Button onClick={shareScreen}>Share Screen</Button>
      <Button danger onClick={leaveConference}>Leave</Button>
    </div>
  );
};

export default ConferenceRoom;
