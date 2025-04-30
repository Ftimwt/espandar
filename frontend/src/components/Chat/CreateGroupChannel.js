import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Button, TextField, Typography, Checkbox, List, ListItem, ListItemText,
  ListItemIcon, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar,
} from '@mui/material';

const API_URL = 'http://localhost:8080';

const CreateGroupChannel = ({ open, onClose, type }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        setError('خطا در دریافت کاربران');
        setOpenSnackbar(true);
      }
    };
    if (open) fetchUsers();
  }, [open, token]);

  const handleToggleUser = (userId) => {
    const currentIndex = selectedUsers.indexOf(userId);
    const newSelected = [...selectedUsers];
    if (currentIndex === -1) {
      newSelected.push(userId);
    } else {
      newSelected.splice(currentIndex, 1);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('نام نمی‌تواند خالی باشد');
      setOpenSnackbar(true);
      return;
    }
    if (selectedUsers.length === 0) {
      setError('حداقل یک عضو باید انتخاب شود');
      setOpenSnackbar(true);
      return;
    }

    try {
      const payload = {
        name,
        user_ids: selectedUsers,
        ...(type === 'channel' && { description }),
      };
      const endpoint = type === 'group' ? '/groups/with-members' : '/channels/with-members';
      const response = await axios.post(`${API_URL}${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setError('');
      onClose();
      navigate(`/chat/${type}/${response.data[type].ID}`);
    } catch (err) {
      setError(err.response?.data?.error || `خطا در ایجاد ${type === 'group' ? 'گروه' : 'کانال'}`);
      setOpenSnackbar(true);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>ایجاد {type === 'group' ? 'گروه' : 'کانال'}</DialogTitle>
      <DialogContent>
        <TextField
          label="نام"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
          required
          error={!!error && !name.trim()}
          helperText={!!error && !name.trim() ? 'نام الزامی است' : ''}
        />
        {type === 'channel' && (
          <TextField
            label="توضیحات"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        )}
        <Typography variant="subtitle1" gutterBottom>
          انتخاب اعضای اولیه
        </Typography>
        <List dense>
          {users.map((user) => (
            <ListItem key={user.ID} button onClick={() => handleToggleUser(user.ID)}>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedUsers.includes(user.ID)}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText primary={user.Username} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
      <Button onClick={onClose}>لغو</Button>
        <Button onClick={handleCreate} variant="contained" color="primary">
          ایجاد
        </Button>
      </DialogActions>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        message={error}
      />
    </Dialog>
  );
};

export default CreateGroupChannel;