import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Button, Typography, Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import { API_URL } from '../../constants/config';
import axios from 'axios';

const CreateGroup = ({ onSuccess }) => {
  const [name, setName] = useState('');
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
      await axios.post(`${API_URL}/groups/with-members`, {
        name,
        user_ids: selectedUserIds,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('گروه با موفقیت ایجاد شد');
      setName('');
      setSelectedUserIds([]);
      onSuccess?.();
    } catch (err) {
      alert('خطا در ایجاد گروه');
    }
  };

  return (
    <Box>
      <Typography variant="h6">ایجاد گروه جدید</Typography>
      <TextField
        fullWidth
        label="نام گروه"
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ my: 2 }}
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
      <Button variant="contained" onClick={handleSubmit}>ایجاد گروه</Button>
    </Box>
  );
};

export default CreateGroup;
