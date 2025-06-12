import {Outlet} from "react-router";
import {userCallStore} from "../../store/callStore.ts";
import VideoCall from "../VideoCall/VideoCall.tsx";
import {useUserStore} from "../../store/userStore.ts";
import {Modal} from "antd";

const CallProvider = () => {
  const {targetID, cancelCall} = userCallStore();
  const {user} = useUserStore();

  function handleCancel() {
    cancelCall();
  }

  return <div className="call">
    {user && targetID &&
        <Modal
            title="تماس تصویری"
            closable={{'aria-label': 'بستن'}}
            open={targetID !== 0}
            onCancel={handleCancel}
            cancelText="قطع تماس"
        >
            <VideoCall targetID={targetID} userID={user.id}/>
        </Modal>
    }
    <Outlet/>
  </div>;
};

export default CallProvider;