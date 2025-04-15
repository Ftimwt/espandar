import React, { useState } from 'react';
import { signUp, login } from '../api';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userData = { username, password };

        if (isLogin) {
            // اگر در حالت ورود (Login) هستیم
            const result = await login(userData);
            console.log(result);
            // مدیریت ورود کاربر (مثلاً ذخیره توکن)
        } else {
            // اگر در حالت ثبت‌نام (Sign Up) هستیم
            const result = await signUp(userData);
            console.log(result);
            // مدیریت ثبت‌نام کاربر
        }
    };

    return (
        <div>
            <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
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
                <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
            </form>
            <button onClick={() => setIsLogin(!isLogin)}>
                Switch to {isLogin ? 'Sign Up' : 'Login'}
            </button>
        </div>
    );
};

export default Auth;