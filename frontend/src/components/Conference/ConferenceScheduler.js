// 📁 components/Conference/ConferenceScheduler.js
import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Snackbar,
} from '@mui/material';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const ConferenceScheduler = ({ token }) => {
  const [openSchedulerDialog, setOpenSchedulerDialog] = useState(false);
  const [openWrapper, setOpenWrapper] = useState(false);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch {
      setError('خطا در دریافت کاربران');
      setOpenSnackbar(true);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!title || !startTime || selectedUsers.length === 0) {
      setError('لطفا عنوان، زمان شروع و اعضا را وارد کنید');
      setOpenSnackbar(true);
      return;
    }
    try {
      const res = await axios.post(
        `${API_URL}/conferences`,
        { title, start_time: new Date(startTime).toISOString(), user_ids: selectedUsers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteLink(res.data.invite_link);
    } catch {
      setError('خطا در زمان‌بندی کنفرانس');
      setOpenSnackbar(true);
    }
  };

  return (
    <>
      <Button variant="contained" onClick={() => { setOpenWrapper((prev) => !prev); if (!openWrapper) fetchUsers(); }}>
        کنفرانس
      </Button>

      {openWrapper && (
        <Button variant="outlined" onClick={() => setOpenSchedulerDialog(true)} sx={{ ml: 1 }}>
          زمان‌بندی کنفرانس جدید
        </Button>
      )}

      <Dialog open={openSchedulerDialog} onClose={() => setOpenSchedulerDialog(false)}>
        <DialogTitle>ایجاد کنفرانس زمان‌بندی‌شده</DialogTitle>
        <DialogContent>
          <TextField
            label="عنوان کنفرانس"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="dense"
          />
          <TextField
            label="زمان شروع"
            type="datetime-local"
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <Typography sx={{ mt: 2 }}>انتخاب اعضا:</Typography>
          <List>
            {users.map((u) => (
              <ListItem key={u.ID} button onClick={() => handleToggleUser(u.ID)}>
                <ListItemIcon>
                  <Checkbox checked={selectedUsers.includes(u.ID)} />
                </ListItemIcon>
                <ListItemText primary={u.Username} />
              </ListItem>
            ))}
          </List>
          {inviteLink && (
            <Typography sx={{ mt: 2 }}>لینک دعوت: <a href={inviteLink}>{inviteLink}</a></Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSubmit} variant="contained">ثبت</Button>
          <Button onClick={() => setOpenSchedulerDialog(false)}>بستن</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={openSnackbar} autoHideDuration={5000} message={error} onClose={() => setOpenSnackbar(false)} />
    </>
  );
};

export default ConferenceScheduler;