// src/components/Contacts/AddContact.js

import React, { useState } from 'react';
import { Container, TextField, Button, Snackbar, Alert } from '@mui/material';
import axios from 'axios';

const AddContact = ({ onContactAdded }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/admin/contacts', 
        { name, phone }, 
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`, // ارسال توکن JWT
          },
        }
      );

      onContactAdded(response.data); // تماس با تابع برای به‌روزرسانی لیست مخاطب‌ها
      setName('');
      setPhone('');
    } catch (error) {
      setErrorMessage('خطا در افزودن مخاطب.');
      setOpenSnackbar(true);
    }
  };

  return (
    <Container>
      <h2>افزودن مخاطب</h2>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          fullWidth
          required
        />
        <Button type="submit" variant="contained" color="primary">
          افزودن مخاطب
        </Button>
      </form>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error">{errorMessage}</Alert>
      </Snackbar>
    </Container>
  );
};

export default AddContact;