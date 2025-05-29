import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Videocam, Call } from '@mui/icons-material';
import CallComponent from '../CallComponent/CallComponent';
import { startCall } from '../../api';

const CallControls = ({ receiverId, token, receiverType }) => {
  const [callType, setCallType] = useState(null); 

  const startCallHandler = async (type) => {
    try {
      await startCall(token, receiverId, type, receiverType);
      setCallType(type);
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const endCall = () => {
    setCallType(null);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
      <IconButton onClick={() => startCallHandler('video')} disabled={!!callType}>
        <Videocam />
      </IconButton>
      <IconButton onClick={() => startCallHandler('voice')} disabled={!!callType}>
        <Call />
      </IconButton>
     <CallComponent
  receiverId={receiverId}
  token={token}
  callType={callType}
  onEndCall={() => {}}
  userId={localStorage.getItem('userId')}
  receiverType={receiverType}
/>
    </Box>
  );
};

export default CallControls;
