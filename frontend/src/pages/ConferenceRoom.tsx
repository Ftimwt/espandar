import {useParams} from 'react-router';
import {useEffect, useMemo} from 'react';
import {useUserStore} from '../store/userStore';
import VideoCall from "../components/VideoCall/VideoCall.tsx";
import {userCallStore} from "../store/callStore.ts";
import {useConferenceByID} from "../api/conference.ts";

const ConferenceRoom = () => {
  const {conferenceID} = useParams();
  const {makeRoom} = userCallStore();
  const {data: conferenceData} = useConferenceByID(Number.parseInt(conferenceID!));
  const {user} = useUserStore();

  useEffect(() => {
    if (!conferenceData) return;
    makeRoom(conferenceData.data.code, []);
  }, [conferenceData]);

  const notStarted = useMemo(() => {
    // return conferenceData?.data.scheduled_at;
    return false;
  }, [conferenceData]);

  const conference = useMemo(() => {
    return conferenceData?.data;
  }, [conferenceData]);

  if (!user) return <div>Loading user...</div>;

  if (notStarted) {
    return (
      <div style={{padding: 20}}>
        <h2>⏳ This conference has not started yet.</h2>
        <p>Please come back at: <b>{conference?.scheduled_at}</b></p>
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
