import { useParams } from 'react-router';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import axios from 'axios';
import { useUserStore } from '../store/userStore';
import ConferenceCall from '../components/Conference/ConferenceCall';

const ConferenceRoom = () => {
  const { conferenceID } = useParams();
  const [conference, setConference] = useState<any>(null);
  const [notStarted, setNotStarted] = useState(false);
  const { user } = useUserStore();

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
        message.error('Failed to load conference info.');
      }
    };

    fetchConference();
  }, [conferenceID]);

  if (!user) return <div>Loading user...</div>;

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
      <h2>🎥 Conference: {conference?.title || conferenceID}</h2>
      <ConferenceCall roomId={conferenceID!} />
    </div>
  );
};

export default ConferenceRoom;
