import React, { useState } from 'react';
import Auth from './components/Auth/Auth'; // اطمینان حاصل کنید که مسیر درست است
import Chat from './components/Chat/Chat'; // اطمینان حاصل کنید که مسیر درست است
import Profile from './components/Profile/Profile'; // اطمینان حاصل کنید که مسیر درست است
import './index.css';

const App = () => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
 
  const handleLogin = (data) => {
    localStorage.setItem('token', data.token); // ذخیره توکن در localStorage
    setToken(data.token);
  };
 
  const handleLogout = () => {
    localStorage.removeItem('token'); // حذف توکن از localStorage
    setToken(null);
  };
 
  return (
    <div>
      <h1>Welcome to Espandar</h1>
      {!token ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <>
          <Profile token={token} onLogout={handleLogout} />
          <Chat token={token} />
        </>
      )}
    </div>
  );
 };
export default App;