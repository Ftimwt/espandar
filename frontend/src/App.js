import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Auth from './components/Auth/Auth'; // فرض بر این است که کامپوننت Auth در این مسیر وجود دارد
import Contacts from './components/Contacts/Contacts';

const App = () => {
  const [userToken, setUserToken] = useState(() => localStorage.getItem('userToken'));
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'));
  const [loading, setLoading] = useState(true);

  const handleUserLogin = (token) => {
    localStorage.setItem('userToken', token);
    setUserToken(token);
  };

  const handleAdminLogin = (token) => {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
  };

  // استفاده از useEffect برای تنظیم loading به false بعد از بارگذاری اولیه
  useEffect(() => {
    setLoading(false); // بعد از بارگذاری اولیه، وضعیت loading را به false تغییر می‌دهیم
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div>
        <h1>Welcome to Espandar</h1>
        <Routes>
          <Route path="/login" element={<Auth onUserLogin={handleUserLogin} onAdminLogin={handleAdminLogin} />} />
          <Route path="/contacts" 
            element={
              adminToken ? <Contacts token={adminToken} isAdmin={true} /> : 
              userToken ? <Contacts token={userToken} isAdmin={false} /> : 
              <Navigate to="/login" />
            } 
          />
          <Route path="*" element={<Navigate to="/login" />} /> {/* هدایت به صفحه لاگین برای تمامی مسیرهای دیگر */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;