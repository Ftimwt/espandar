import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Button,
  TextField,
  Typography,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

const API_URL = 'http://localhost:8080';

const CreateGroupChannel = ({ open, onClose, type }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');
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
        console.error('Error fetching users:', err);
      }
    };
    if (open) {
      fetchUsers();
    }
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
      return;
    }
    if (selectedUsers.length === 0) {
      setError('حداقل یک عضو باید انتخاب شود');
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

      console.log(`${type} created:`, response.data);
      setError('');
      onClose();
      navigate(`/chat/${type}/${response.data[type].ID}`);
    } catch (err) {
      setError(err.response?.data?.error || `خطا در ایجاد ${type === 'group' ? 'گروه' : 'کانال'}`);
      console.error(`Error creating ${type}:`, err);
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
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>لغو</Button>
        <Button onClick={handleCreate} variant="contained" color="primary">
          ایجاد
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroupChannel;