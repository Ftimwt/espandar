import { Outlet } from "react-router";
import { Modal, Button } from "antd";
import { userCallStore } from "../../store/callStore.ts";
import VideoCall from "../VideoCall/VideoCall.tsx";
import { useUserStore } from "../../store/userStore.ts";

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
      {user && targetID ? (
        <Modal
          title={incoming ? "تماس ورودی" : "تماس تصویری"}
          closable={{ 'aria-label': 'بستن' }}
          open={targetID !== 0}
          onCancel={handleCancel}
          footer={
            incoming ? [
              <Button key="reject" danger onClick={rejectCall}>رد تماس</Button>,
              <Button
                key="accept"
                type="primary"
                onClick={() => {
                  acceptCall();
                  startCall(targetID, room); 
                }}
              >
                پذیرفتن
              </Button>,
            ] : [
              <Button key="cancel" onClick={handleCancel}>قطع تماس</Button>
            ]
          }
        >
          {!incoming && <VideoCall targetID={targetID} userID={user.id} />}
        </Modal>
      ) : null}
      <Outlet />
    </div>
  );
};

export default CallProvider;
