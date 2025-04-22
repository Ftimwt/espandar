import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Auth = ({ onUserLogin, onAdminLogin }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const navigate = useNavigate();

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // اصلاح مسیر برای ثبت‌نام ادمین
    const url = isSignUp
      ? (isAdmin ? 'http://localhost:8080/admin/signup' : 'http://localhost:8080/signup')
      : (isAdmin ? 'http://localhost:8080/admin/login' : 'http://localhost:8080/login');
    
    const body = isSignUp
      ? JSON.stringify({ username, password, email, firstName, lastName })
      : JSON.stringify({ username, password });

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const token = response.data.token;
      console.log('Login/SignUp successful, token:', token); // لاگ‌گذاری
      if (isAdmin) {
        onAdminLogin(token);
      } else {
        onUserLogin(token);
      }
      navigate('/contacts');
    } catch (error) {
      setErrorMessage(
        isSignUp
          ? 'خطا در ثبت‌نام.'
          : (isAdmin ? 'نام کاربری یا رمز عبور ادمین اشتباه است.' : 'نام کاربری یا رمز عبور اشتباه است.')
      );
      setOpenSnackbar(true);
      console.error('Auth error:', error.response?.data);
    }
  };

  return (
    <Container maxWidth="xs">
      <Typography variant="h5" align="center">
        {isSignUp ? (isAdmin ? 'ثبت‌نام ادمین' : 'ثبت‌نام') : (isAdmin ? 'ورود به حساب ادمین' : 'ورود به حساب کاربر')}
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Username"
          variant="outlined"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        {isSignUp && (
          <>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="First Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <TextField
              label="Last Name"
              variant="outlined"
              fullWidth
              margin="normal"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </>
        )}
        <TextField
          label="Password"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {isSignUp ? 'ثبت‌نام' : 'ورود'}
        </Button>
      </form>
      <Button 
        onClick={() => {
          setIsSignUp((prev) => !prev);
          setUsername('');
          setPassword('');
          setEmail('');
          setFirstName('');
          setLastName('');
        }} 
        color="secondary" 
        fullWidth
      >
        {isSignUp ? 'قبلاً حساب دارید؟ ورود' : 'حساب کاربری ندارید؟ ثبت‌نام'}
      </Button>
      <Button 
        onClick={() => {
          setIsAdmin((prev) => !prev);
          setUsername('');
          setPassword('');
          setEmail('');
          setFirstName('');
          setLastName('');
        }} 
        color="secondary" 
        fullWidth
      >
        {isAdmin ? 'ورود به حساب کاربر' : 'ورود به حساب ادمین'}
      </Button>
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error">{errorMessage}</Alert>
      </Snackbar>
    </Container>
  );
};

export default Auth;