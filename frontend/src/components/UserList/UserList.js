// UserList.js
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material';

const UserList = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const response = await fetch('http://localhost:8080/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setErrorMessage('خطا در دریافت لیست کاربران.');
        setOpenSnackbar(true);
      }
    };

    fetchUsers();
  }, [token]);

  const handleChatWithUser = (user) => {
    // اینجا می‌توانید منطق چت با کاربر را پیاده‌سازی کنید
    console.log(`Start chat with ${user.username}`);
  };

  return (
    <Container>
      <Typography variant="h5">User List</Typography>
      <List>
        {users.map((user) => (
          <ListItem button key={user.id} onClick={() => handleChatWithUser(user)}>
            <ListItemText primary={user.username} />
          </ListItem>
        ))}
      </List>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserList;