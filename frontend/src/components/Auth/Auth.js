import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp, login } from '../../api'; // مسیر فایل سرویس
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';

const Auth = ({ onUserLogin, onAdminLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignup && !validatePhone(phone)) {
      setError('شماره تلفن نامعتبر است');
      return;
    }

    const payload = { username, password, phone, role: isAdmin ? 'admin' : 'user' };

    try {
      let response;
      if (isAdmin) {
        if (isSignup) {
          response = await signUp(payload); // استفاده از signUp
        } else {
          response = await login(payload); // استفاده از login
        }
      } else {
        if (isSignup) {
          response = await signUp(payload);
        } else {
          response = await login(payload);
        }
      }

      // چک کردن پاسخ سرور
      if (!response || !response.token || !response.user_id) {
        console.error('Auth: Invalid response from server:', response);
        setError('خطا: پاسخ سرور ناقص است');
        return;
      }

      console.log(`${isAdmin ? 'Admin' : 'User'} ${isSignup ? 'signup' : 'login'} response:`, response);

      // ذخیره توکن و user_id
      const { token, user_id } = response;
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user_id);

      // فراخوانی callback مناسب
      if (isAdmin) {
        onAdminLogin(token);
      } else {
        onUserLogin(token);
      }

      navigate('/contacts');
    } catch (error) {
      console.error('Auth: Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setError(
        error.response?.data?.error ||
          (error.message === 'Network Error'
            ? 'اتصال به سرور برقرار نشد. لطفاً مطمئن شوید که سرور در حال اجراست.'
            : 'خطا در ورود یا ثبت‌نام')
      );
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Typography variant="h4" gutterBottom>
        {isSignup ? 'ثبت‌نام' : 'ورود'} {isAdmin ? 'ادمین' : 'کاربر'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 400 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <TextField
          label="نام کاربری"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          fullWidth
        />
        <TextField
          label="رمز عبور"
          type="password"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
        />
        {isSignup && (
          <TextField
            label="شماره تلفن"
            variant="outlined"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            fullWidth
          />
        )}
        <Button type="submit" variant="contained" color="primary" fullWidth>
          {isSignup ? 'ثبت‌نام' : 'ورود'}
        </Button>
      </Box><Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isAdmin}
              onChange={() => setIsAdmin(!isAdmin)}
              color="primary"
            />
          }
          label={`تغییر به ${isAdmin ? 'کاربر' : 'ادمین'}`}
        />
        <Button
          variant="outlined"
          onClick={() => setIsSignup(!isSignup)}
        >
          تغییر به {isSignup ? 'ورود' : 'ثبت‌نام'}
        </Button>
      </Box>
    </Box>
  );
};

export default Auth;