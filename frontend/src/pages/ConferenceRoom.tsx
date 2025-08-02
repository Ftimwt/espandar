import {useParams} from 'react-router';
import {useEffect, useState} from 'react';
import {message} from 'antd';
import axios from 'axios';
import {useUserStore} from '../store/userStore';
import VideoCall from "../components/VideoCall/VideoCall.tsx";
import {userCallStore} from "../store/callStore.ts";

const ConferenceRoom = () => {
  const {conferenceID} = useParams();
  const [conference, setConference] = useState<any>(null);
  const [notStarted, setNotStarted] = useState(false);
  const {makeRoom} = userCallStore();
  const {user} = useUserStore();

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/conference/${conferenceID}`);
        const conf = res.data.conference;
        setConference(conf);

        // const now = new Date();
        // const scheduled = new Date(conf.scheduledAt);
        // if (scheduled > now) {
        //   setNotStarted(true);
        // }
        console.log(conf.code);
        makeRoom(conf.code, []);

      } catch (err) {
        message.error('Failed to load conference info.');
      }
    };

    fetchConference();
  }, [conferenceID]);

  if (!user) return <div>Loading user...</div>;

  if (notStarted) {
    return (
      <div style={{padding: 20}}>
        <h2>⏳ This conference has not started yet.</h2>
        <p>Please come back at: <b>{conference?.scheduledAt}</b></p>
      </div>
    );
  }

  return (
    <div>
      <h2>🎥 Conference: {conference?.title || conferenceID}</h2>
      <VideoCall/>
    </div>
  );
};

export default ConferenceRoom;
