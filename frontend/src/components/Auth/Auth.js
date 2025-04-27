import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

    const payload = { username, password, phone };
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    let response;

    try {
        if (isAdmin) {
            if (isSignup) {
                response = await axios.post(`${API_URL}/admin/signup`, payload);
                console.log('Auth: Admin signup response:', response.data);
                if (!response.data.user_id) {
                    console.error('Auth: user_id not found in response');
                    setError('خطا: شناسه کاربر از سرور دریافت نشد');
                    return;
                }
                onAdminLogin(response.data.token);
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_id', response.data.user_id);
                navigate('/contacts');
            } else {
                response = await axios.post(`${API_URL}/admin/login`, payload);
                console.log('Auth: Admin login response:', response.data);
                if (!response.data.user_id) {
                    console.error('Auth: user_id not found in response');
                    setError('خطا: شناسه کاربر از سرور دریافت نشد');
                    return;
                }
                onAdminLogin(response.data.token);
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_id', response.data.user_id);
                navigate('/contacts');
            }
        } else {
            if (isSignup) {
                response = await axios.post(`${API_URL}/signup`, payload);
                console.log('Auth: User signup response:', response.data);
                if (!response.data.user_id) {
                    console.error('Auth: user_id not found in response');
                    setError('خطا: شناسه کاربر از سرور دریافت نشد');
                    return;
                }
                onUserLogin(response.data.token);
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_id', response.data.user_id);
                navigate('/contacts');
            } else {
                response = await axios.post(`${API_URL}/login`, payload);
                console.log('Auth: User login response:', response.data);
                if (!response.data.user_id) {
                    console.error('Auth: user_id not found in response');
                    setError('خطا: شناسه کاربر از سرور دریافت نشد');
                    return;
                }
                onUserLogin(response.data.token);
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user_id', response.data.user_id);
                navigate('/contacts');
            }
        }
    } catch (error) {
        console.error('Auth: Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            code: error.code,
        });
        setError(
            error.response?.data?.error ||
            error.message === 'Network Error'
                ? 'اتصال به سرور برقرار نشد. لطفاً مطمئن شوید که سرور در حال اجراست.'
                : 'خطا در ورود یا ثبت‌نام'
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
        {isSignup && (<TextField
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
      </Box>

      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
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