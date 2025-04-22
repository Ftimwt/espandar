import React, { useState } from 'react';
import { Container, TextField, Button, Snackbar, Alert } from '@mui/material';
import { addContact } from '../../api'; 

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
        const token = localStorage.getItem('adminToken');
        const response = await addContact(token, { name, phone });
        onContactAdded(response);
        setName('');
        setPhone('');
    } catch (error) {
        setErrorMessage(error.response?.data?.error || 'خطا در افزودن مخاطب.');
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