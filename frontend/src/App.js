import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import Auth from './components/Auth/Auth';
import Contacts from './components/Contacts/Contacts';
import Chat from './components/Chat/Chat';
import WebSocketService from './services/WebSocketService'; // مسیر را تنظیم کنید
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]); // برای ذخیره پیام‌ها

  // اعتبارسنجی توکن
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        console.log('App: No token found in localStorage');
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:8080/contacts', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        console.log('App: Token is valid, response:', response.data);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('App: Token validation failed:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setIsAuthenticated(false);
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userId');
        setToken('');
        setIsAdmin(false);
      }
    };
    validateToken();
  }, []);

  // WebSocket عمومی برای کاربر
  useEffect(() => {
    if (!token || !isAuthenticated || !localStorage.getItem('userId')) {
        console.log('App: Skipping WebSocket connection due to missing token/isAuthenticated/userId');
        return;
    }

    console.log('App: Initializing global WebSocket for user:', localStorage.getItem('userId'));
    const userSocket = new WebSocketService(localStorage.getItem('userId'), token, 'chat', (message) => {
        console.log('App: Global WebSocket message received:', message);
        if (message.event === 'message_seen' && message.data) {
            console.log('App: Updating message status for message_id:', message.data.message_id);
            setMessages((prev) => {
                const updatedMessages = prev.map((msg) =>
                    msg.ID === Number(message.data.message_id)
                        ? {
                              ...msg,
                              seen: !!message.data.seen,
                              is_received: !!message.data.is_received,
                          }
                        : msg
                );
                return [...updatedMessages];
            });
        }
    });

    return () => {
        console.log('App: Disconnecting global WebSocket');
        userSocket.disconnect();
    };
}, [token, isAuthenticated]);

  const handleUserLogin = (newToken, userId) => {
    console.log('App: User logged in, token:', newToken, 'userId:', userId);
    setToken(newToken);
    setIsAdmin(false);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('isAdmin', 'false');
    localStorage.setItem('userId', userId.toString());
  };

  const handleAdminLogin = (newToken, userId) => {
    console.log('App: Admin logged in, token:', newToken, 'userId:', userId);
    setToken(newToken);
    setIsAdmin(true);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('userId', userId.toString());
  };

  const handleLogout = () => {
    console.log('App: Logging out');
    setToken('');
    setIsAdmin(false);
    setIsAuthenticated(false);
    setMessages([]);
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userId');
  };return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Contacts token={token} isAdmin={isAdmin} onLogout={handleLogout} />
            ) : (
              <Auth onUserLogin={handleUserLogin} onAdminLogin={handleAdminLogin} />
            )
          }
        />
        <Route
          path="/contacts"
          element={
            isAuthenticated ? (
              <Contacts token={token} isAdmin={isAdmin} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/chat/user/:id"
          element={
            isAuthenticated ? (
              <Chat messages={messages} setMessages={setMessages} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;