import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  Alert,
} from '@mui/material';

const Auth = ({ onUserLogin, onAdminLogin }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  console.log('Auth: Rendering, isAdmin:', isAdmin, 'isSignup:', isSignup);

  const validatePhone = (phone) => {
    const regex = /^09[0-9]{9}$/;
    return regex.test(phone) && phone.length === 11;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log('Auth: Submitting form:', formData);

    if (!validatePhone(formData.phone)) {
      setError('شماره تلفن باید ۱۱ رقم باشد و با 09 شروع شود');
      console.log('Auth: Invalid phone number:', formData.phone);
      return;
    }

    try {
      let response;
      const payload = isSignup
        ? formData
        : { phone: formData.phone, password: formData.password };

      console.log('Auth: Sending request, payload:', payload);

      if (isAdmin) {
        if (isSignup) {
          response = await axios.post('http://localhost:8080/admin/signup', payload);
          console.log('Auth: Admin signup response:', response.data);
          onAdminLogin(response.data.token);
          navigate('/contacts');
        } else {
          response = await axios.post('http://localhost:8080/admin/login', payload);
          console.log('Auth: Admin login response:', response.data);
          onAdminLogin(response.data.token);
          navigate('/contacts');
        }
      } else {
        if (isSignup) {
          response = await axios.post('http://localhost:8080/signup', payload);
          console.log('Auth: User signup response:', response.data);
          onUserLogin(response.data.token);
          navigate('/contacts');
        } else {
          response = await axios.post('http://localhost:8080/login', payload);
          console.log('Auth: User login response:', response.data);
          onUserLogin(response.data.token);
          navigate('/contacts');
        }
      }
    } catch (error) {
      console.error('Auth: Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(
        error.response?.data?.error || 'خطا در ورود یا ثبت‌نام: مشکل ناشناخته'
      );
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h5" align="center" gutterBottom>
          {isAdmin ? 'ورود/ثبت‌نام ادمین' : 'ورود/ثبت‌نام کاربر'}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <TextField
              label="نام کاربری"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              fullWidth
              margin="normal"
              required
            />
          )}
          <TextField
            label="شماره تلفن"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="09123456789"fullWidth
            margin="normal"
            required
          />
          <TextField
            label="رمز عبور"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            fullWidth
            margin="normal"
            required
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isAdmin}
                onChange={() => setIsAdmin(!isAdmin)}
              />
            }
            label="ادمین"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isSignup}
                onChange={() => setIsSignup(!isSignup)}
              />
            }
            label={isSignup ? 'تغییر به ورود' : 'تغییر به ثبت‌نام'}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            {isSignup ? 'ثبت‌نام' : 'ورود'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default Auth;