import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import Auth from './components/Auth/Auth';
import Contacts from './components/Contacts/Contacts';
import Chat from './components/Chat/Chat';
import WebSocketService from './services/WebSocketService';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import GroupManager from './pages/GroupManager';
import ChannelManager from './pages/ChannelManager';
import ConferenceRoom from './pages/ConferenceRoom';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await axios.get('http://localhost:8080/contacts', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        setIsAuthenticated(true);
      } catch (error) {
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

  useEffect(() => {
    if (!token || !isAuthenticated || !localStorage.getItem('userId')) return;

    const userSocket = new WebSocketService(localStorage.getItem('userId'), token, 'chat', (message) => {
      if (message.event === 'message_seen' && message.data) {
        setMessages((prev) => {
          return prev.map((msg) =>
            msg.ID === Number(message.data.message_id)
              ? { ...msg, seen: !!message.data.seen, is_received: !!message.data.is_received }
              : msg
          );
        });
      }
    });

    return () => userSocket.disconnect();
  }, [token, isAuthenticated]);

  const handleUserLogin = (newToken, userId) => {
    setToken(newToken);
    setIsAdmin(false);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('isAdmin', 'false');
    localStorage.setItem('userId', userId.toString());
  };

  const handleAdminLogin = (newToken, userId) => {
    setToken(newToken);
    setIsAdmin(true);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('userId', userId.toString());
  };

  const handleLogout = () => {
    setToken('');
    setIsAdmin(false);
    setIsAuthenticated(false);
    setMessages([]);
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userId');
  };

  return (
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
        <Route
          path="/chat/group/:id"
          element={
            isAuthenticated ? (
              <Chat messages={messages} setMessages={setMessages} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/chat/channel/:id"
          element={
            isAuthenticated ? (
              <Chat messages={messages} setMessages={setMessages} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/groups/manage"
          element={isAuthenticated ? <GroupManager /> : <Navigate to="/" />}
        />
        <Route
          path="/channels/manage"
          element={isAuthenticated ? <ChannelManager /> : <Navigate to="/" />}
        />
        <Route
          path="/conference/:room_id"
          element={isAuthenticated ? <ConferenceRoom /> : <Navigate to="/" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
