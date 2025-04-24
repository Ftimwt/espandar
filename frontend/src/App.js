import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import Auth from './components/Auth/Auth';
import Contacts from './components/Contacts/Contacts';
import Chat from './components/Chat/Chat';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      try {
        await axios.get('http://localhost:8080/contacts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('App: Token is valid');
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
        setToken('');
        setIsAdmin(false);
      }
    };
    validateToken();
  }, [token]);

  const handleUserLogin = (newToken) => {
    console.log('App: User logged in, token:', newToken);
    setToken(newToken);
    setIsAdmin(false);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('isAdmin', 'false');
  };

  const handleAdminLogin = (newToken) => {
    console.log('App: Admin logged in, token:', newToken);
    setToken(newToken);
    setIsAdmin(true);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('isAdmin', 'true');
  };

  const handleLogout = () => {
    console.log('App: Logging out');
    setToken('');
    setIsAdmin(false);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/contacts" />
            ) : (
              <Auth
                onUserLogin={handleUserLogin}
                onAdminLogin={handleAdminLogin}
              />
            )
          }
        />
        <Route
          path="/contacts"
          element={
            isAuthenticated ? (
              <Contacts
                token={token}
                isAdmin={isAdmin}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/chat/user/:id"
          element={
            isAuthenticated ? (
              <Chat token={token} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;