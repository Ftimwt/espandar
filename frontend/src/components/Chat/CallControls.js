import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { Videocam, Call } from '@mui/icons-material';
import CallComponent from '../CallComponent/CallComponent';
import { startCall } from '../../api';

const CallControls = ({ receiverId, token }) => {
  const [callType, setCallType] = useState(null); // null, 'video', 'voice'

  const startCall = async (type) => {
    try {
      await startCall(token, receiverId, type);
      setCallType(type);
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  const endCall = () => {
    setCallType(null);
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, p: 1, borderBottom: '1px solid #ccc' }}>
      <IconButton onClick={() => startCall('video')} disabled={!!callType}>
        <Videocam />
      </IconButton>
      <IconButton onClick={() => startCall('voice')} disabled={!!callType}>
        <Call />
      </IconButton>
      {callType && (
        <CallComponent
          receiverId={receiverId}
          token={token}
          callType={callType}
          onEndCall={endCall}
          userId={localStorage.getItem('userId')}
        />
      )}
    </Box>
  );
};

export default CallControls;