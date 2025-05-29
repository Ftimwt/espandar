import { useState } from 'react';
import {
  Box, Button, Typography, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Checkbox, FormControlLabel
} from '@mui/material';
import { DesktopDateTimePicker } from '@mui/x-date-pickers/DesktopDateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axios from 'axios';
import { API_URL } from '../../constants/config';

const ConferencePanel = ({ token, contacts }) => {
  const [show, setShow] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(new Date());

  const toggleUser = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateConference = async (isScheduled) => {
    if (selectedUsers.length === 0) return alert('مخاطب انتخاب نشده');
    const payload = {
      title: title || 'کنفرانس جدید',
      start_time: isScheduled ? startTime.toISOString() : new Date().toISOString(),
      user_ids: selectedUsers
    };
    try {
      const res = await axios.post(`${API_URL}/conference`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('کنفرانس با موفقیت ایجاد شد');
      const { invite_link } = res.data;

      // ارسال لینک به هر کاربر
      for (let userId of selectedUsers) {
        const form = new FormData();
        form.append('content', `به کنفرانس بپیوندید: ${invite_link}`);
        form.append('type', 'text');
        await axios.post(`${API_URL}/messages/user/${userId}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShow(false);
      setShowScheduler(false);
      setSelectedUsers([]);
      setTitle('');
    } catch (err) {
      alert('خطا در ایجاد کنفرانس');
      console.error(err);
    }
  };

  return (
    <>
      <Button variant="contained" onClick={() => setShow(p => !p)} sx={{ ml: 1 }}>
        کنفرانس
      </Button>

      {show && (
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => setShowScheduler(true)} sx={{ mr: 1 }}>
            زمان‌بندی کنفرانس
          </Button>
          <Button variant="outlined" onClick={() => handleCreateConference(false)}>
            ایجاد فوری کنفرانس
          </Button>
        </Box>
      )}

      <Dialog open={showScheduler} onClose={() => setShowScheduler(false)} maxWidth="sm" fullWidth>
        <DialogTitle>زمان‌بندی کنفرانس</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="عنوان"
            value={title}
            onChange={e => setTitle(e.target.value)}
            sx={{ my: 2 }}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DesktopDateTimePicker
              label="تاریخ و ساعت شروع"
              value={startTime}
              onChange={setStartTime}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
          <Typography variant="subtitle1" sx={{ mt: 2 }}>انتخاب مخاطبین:</Typography>
          {contacts.map((user) => (
            <FormControlLabel
              key={user.user_id || user.id}
              control={
                <Checkbox
                  checked={selectedUsers.includes(user.user_id || user.id)}
                  onChange={() => toggleUser(user.user_id || user.id)}
                />
              }
              label={user.name || user.username || 'بدون‌نام'}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScheduler(false)}>لغو</Button>
          <Button variant="contained" onClick={() => handleCreateConference(true)}>ایجاد</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConferencePanel;
