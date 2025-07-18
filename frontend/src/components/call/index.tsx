import {Outlet} from 'react-router';
import {userCallStore} from '../../store/callStore.ts';
import {useUserStore} from '../../store/userStore.ts';
import {Button, Flex, Modal, Typography} from "antd";
import {useEffect} from "react";
import VideoCall from "../VideoCall/VideoCall.tsx";

const CallProvider = () => {
  const {user} = useUserStore();
  const {
    targetID,
    room,
    incoming,
    acceptCall,
    rejectCall,
    startCall,
  } = userCallStore();


  useEffect(() => {
    if (incoming) return;
    startCall(targetID, room);
  }, [incoming]);

  if (!user?.id) {
    return <Outlet/>
  }

  return (
    <div className="call">
      <Modal open={room != ""} title={incoming ? "Calling..." : 'Call'} onOk={acceptCall} footer={() => <></>}>
        <Typography>

        </Typography>
        {incoming ? <Flex>
            <Button variant="solid" onClick={acceptCall}>Accept</Button>
            <Button variant="text" onClick={rejectCall}>Reject</Button>
          </Flex> :
          <VideoCall key={room}/>
        }
      </Modal>
      <Outlet/>
    </div>
  );
};

export default CallProvider;
