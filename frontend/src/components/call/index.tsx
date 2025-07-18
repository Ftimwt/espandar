import { Outlet } from 'react-router';
import { userCallStore } from '../../store/callStore.ts';
import VideoCall from '../VideoCall/VideoCall.tsx';
import { useUserStore } from '../../store/userStore.ts';

const CallProvider = () => {
  const { user } = useUserStore();
  const {
    targetID,
    room,
    incoming,
    cancelCall,
    acceptCall,
    rejectCall,
    startCall, // ✅ اضافه شده
  } = userCallStore();

  function handleCancel() {
    cancelCall();
  }

  return (
    <div className="call">
      {user && <VideoCall targetID={2} userID={1} />}
      <Outlet />
    </div>
  );
};

export default CallProvider;
