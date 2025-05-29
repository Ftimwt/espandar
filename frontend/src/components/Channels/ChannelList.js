import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemText, IconButton, Button
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const ChannelList = ({ reload }) => {
  const token = localStorage.getItem('token');
  const userId = parseInt(localStorage.getItem('userId'));
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);

  const fetchChannels = useCallback(async () => {
    const res = await axios.get(`${API_URL}/channels?page=1&perpage=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setChannels(res.data.channels || []);
  }, [token]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels, reload]);

  const removeMember = async (channelId, memberId) => {
    try {
      await axios.delete(`${API_URL}/channel/${channelId}/user/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchChannels();
    } catch (err) {
      alert('خطا در حذف عضو');
    }
  };

  const deleteChannel = async (channelId) => {
    if (!window.confirm("آیا از حذف کانال مطمئن هستید؟")) return;
    try {
      await axios.delete(`${API_URL}/channel/${channelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchChannels();
    } catch (err) {
      alert('خطا در حذف کانال');
    }
  };

  const leaveChannel = async (channelId) => {
    try {
      await axios.post(`${API_URL}/channel/${channelId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchChannels();
    } catch (err) {
      alert('خطا در خروج از کانال');
    }
  };

  return (
    <Box>
      <Typography variant="h6">لیست کانال‌ها</Typography>
      {channels.map((ch) => (
        <Box key={ch.ID} sx={{ border: '1px solid #ccc', my: 2, p: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => navigate(`/chat/channel/${ch.ID}`)}
          >
            📣 {ch.name}
          </Typography>
          <Typography variant="body2">{ch.description}</Typography>
          <Typography variant="body2">اعضا:</Typography>
          <List dense>
            {ch.members?.map((member) => (
              <ListItem key={member.id} secondaryAction={
                ch.creator_id === userId && member.id !== userId && (
                  <IconButton onClick={() => removeMember(ch.ID, member.id)}>
                    <Delete />
                  </IconButton>
                )
              }>
                <ListItemText primary={member.username} />
              </ListItem>
            ))}
          </List>
          {ch.creator_id === userId ? (
            <Button color="error" onClick={() => deleteChannel(ch.ID)}>
              حذف کانال
            </Button>
          ) : (
            <Button onClick={() => leaveChannel(ch.ID)}>
              خروج از کانال
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ChannelList;
