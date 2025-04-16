// components/Auth.js
import React, { useState } from 'react';
import './Auth.css'; // وارد کردن CSS مخصوص این کامپوننت

const Auth = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false); // حالت برای ثبت‌نام
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isSignUp ? 'http://localhost:8080/signup' : 'http://localhost:8080/login';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const data = await response.json();
            onLogin(data); // ارسال توکن به کامپوننت والد
        } else {
            console.error(isSignUp ? 'Sign up failed' : 'Login failed');
        }
    };

    return (
        <div className="container">
            <h1>{isSignUp ? 'Sign Up' : 'Login'}</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">{isSignUp ? 'Sign Up' : 'Login'}</button>
            </form>
            <button onClick={() => setIsSignUp(!isSignUp)}>
                Switch to {isSignUp ? 'Login' : 'Sign Up'}
            </button>
        </div>
    );
};

export default Auth;