import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemText, IconButton, Button
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const GroupList = ({ reload }) => {
  const token = localStorage.getItem('token');
  const userId = parseInt(localStorage.getItem('userId'));
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);

  const fetchGroups = useCallback(async () => {
    const res = await axios.get(`${API_URL}/groups?page=1&perpage=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setGroups(res.data.groups || []);
  }, [token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups, reload]);

  const removeMember = async (groupId, memberId) => {
    try {
      await axios.delete(`${API_URL}/group/${groupId}/user/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups();
    } catch (err) {
      alert('خطا در حذف عضو');
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm("آیا از حذف گروه مطمئن هستید؟")) return;
    try {
      await axios.delete(`${API_URL}/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups();
    } catch (err) {
      alert('خطا در حذف گروه');
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      await axios.post(`${API_URL}/group/${groupId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchGroups();
    } catch (err) {
      alert('خطا در خروج از گروه');
    }
  };

  return (
    <Box>
      <Typography variant="h6">لیست گروه‌ها</Typography>
      {groups.map((group) => (
        <Box key={group.ID} sx={{ border: '1px solid #ccc', my: 2, p: 2 }}>
          <Typography
            variant="subtitle1"
            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => navigate(`/chat/group/${group.ID}`)}
          >
            🧑‍🤝‍🧑 {group.name}
          </Typography>
          <Typography variant="body2">اعضا:</Typography>
          <List dense>
            {group.members?.map((member) => (
              <ListItem key={member.id} secondaryAction={
                group.creator_id === userId && member.id !== userId && (
                  <IconButton onClick={() => removeMember(group.ID, member.id)}>
                    <Delete />
                  </IconButton>
                )
              }>
                <ListItemText primary={member.username} />
              </ListItem>
            ))}
          </List>
          {group.creator_id === userId ? (
            <Button color="error" onClick={() => deleteGroup(group.ID)}>
              حذف کل گروه
            </Button>
          ) : (
            <Button onClick={() => leaveGroup(group.ID)}>
              خروج از گروه
            </Button>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default GroupList;
