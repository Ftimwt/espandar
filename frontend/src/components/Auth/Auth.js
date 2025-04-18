import React, { useState } from 'react';
import {
 Container,
 Typography,
 TextField,
 Button,
 Snackbar,
 Alert,
} from '@mui/material'; 

const Auth = ({ onLogin }) => {
 const [isSignUp, setIsSignUp] = useState(false); // حالت برای ثبت‌نام
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [email, setEmail] = useState(''); // فیلد ایمیل برای ثبت‌نام
 const [firstName, setFirstName] = useState(''); // فیلد نام
 const [lastName, setLastName] = useState(''); // فیلد نام خانوادگی
 const [errorMessage, setErrorMessage] = useState(''); // حالت برای نگهداری پیام خطا
 const [openSnackbar, setOpenSnackbar] = useState(false); // حالت برای کنترل نمایش Snackbar

 const handleCloseSnackbar = () => {
   setOpenSnackbar(false); // بستن Snackbar
 };

 const handleSubmit = async (e) => {
   e.preventDefault();
   const url = isSignUp ? 'http://localhost:8080/signup' : 'http://localhost:8080/login';
   const body = isSignUp
     ? JSON.stringify({ username, password, email, first_name: firstName, last_name: lastName }) // اطلاعات ثبت‌نام
     : JSON.stringify({ username, password }); // اطلاعات ورود

   const response = await fetch(url, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: body,
   });

   if (response.ok) {
     const data = await response.json();
     onLogin(data); // ارسال توکن به کامپوننت والد
   } else {
     // بررسی وضعیت خطا
     if (!isSignUp) {
       setErrorMessage('شما ثبت‌نام نکرده‌اید.'); // پیام خطا برای ورود در صورتی که کاربر ثبت‌نام نکرده باشد
     } else {
       setErrorMessage('رمز عبور اشتباه است.'); // پیام خطا برای رمز اشتباه
     }
     setOpenSnackbar(true); // نمایش Snackbar
   }
 };

 return (
   <Container maxWidth="xs" className="container">
     <Typography variant="h5" align="center">
       {isSignUp ? 'Sign Up' : 'Login'}
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
       {isSignUp && ( // فقط در حالت ثبت‌نام نمایش داده می‌شود
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
         {isSignUp ? 'Sign Up' : 'Login'}
       </Button>
     </form>
     <Button onClick={() => setIsSignUp(!isSignUp)} color="secondary">
       Switch to {isSignUp ? 'Login' : 'Sign Up'}
     </Button>
     
     {/* نمایش Snackbar برای پیام خطا */}
     <Snackbar
       open={openSnackbar}
       autoHideDuration={6000} // زمان اتوماتیک بسته شدن Snackbar
       onClose={handleCloseSnackbar}
     >
       <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
         {errorMessage}
       </Alert>
     </Snackbar>
   </Container>
 );
};

export default Auth;