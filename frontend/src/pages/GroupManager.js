import React, { useState } from 'react';
import CreateGroup from '../components/Groups/CreateGroup';
import GroupList from '../components/Groups/GroupList';
import { Box, Typography, Divider } from '@mui/material';

const GroupManager = () => {
  const [reloadFlag, setReloadFlag] = useState(false);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5">مدیریت گروه</Typography>
      <Divider sx={{ my: 2 }} />
      <CreateGroup onSuccess={() => setReloadFlag((prev) => !prev)} />
      <Divider sx={{ my: 3 }} />
      <GroupList reload={reloadFlag} />
    </Box>
  );
};

export default GroupManager;
