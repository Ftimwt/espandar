import React, { useState } from 'react';
import CreateChannel from '../components/Channels/CreateChannel';
import ChannelList from '../components/Channels/ChannelList';
import { Box, Typography, Divider } from '@mui/material';

const ChannelManager = () => {
  const [reloadFlag, setReloadFlag] = useState(false);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">مدیریت کانال</Typography>
      <Divider sx={{ my: 2 }} />
      <CreateChannel onSuccess={() => setReloadFlag(prev => !prev)} />
      <Divider sx={{ my: 3 }} />
      <ChannelList reload={reloadFlag} />
    </Box>
  );
};

export default ChannelManager;