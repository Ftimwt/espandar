import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Button, Typography, Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import { API_URL } from '../../constants/config';
import axios from 'axios';

const CreateChannel = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    axios.get(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => setUsers(res.data));
  }, [token]);

  const handleSubmit = async () => {
    try {
      await axios.post(`${API_URL}/channels/with-members`, {
        name,
        description,
        user_ids: selectedUserIds,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('کانال با موفقیت ایجاد شد');
      setName('');
      setDescription('');
      setSelectedUserIds([]);
      onSuccess?.();
    } catch (err) {
      alert('خطا در ایجاد کانال');
    }
  };

  return (
    <Box>
      <Typography variant="h6">ایجاد کانال جدید</Typography>
      <TextField
        fullWidth
        label="نام کانال"
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ my: 2 }}
      />
      <TextField
        fullWidth
        label="توضیحات"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Typography>افزودن اعضا:</Typography>
      <FormGroup>
        {users.map((user) => (
          <FormControlLabel
            key={user.id}
            control={
              <Checkbox
                checked={selectedUserIds.includes(user.id)}
                onChange={() => {
                  setSelectedUserIds((prev) =>
                    prev.includes(user.id)
                      ? prev.filter((id) => id !== user.id)
                      : [...prev, user.id]
                  );
                }}
              />
            }
            label={user.username}
          />
        ))}
      </FormGroup>
      <Button variant="contained" onClick={handleSubmit}>ایجاد کانال</Button>
    </Box>
  );
};

export default CreateChannel;