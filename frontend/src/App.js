import React, { useState } from 'react';
import Auth from './components/Auth'; // اطمینان حاصل کنید که مسیر درست است
import Chat from './components/Chat';
import Profile from './components/Profile';

const App = () => {
    const [token, setToken] = useState(null);
    const [userID, setUserID] = useState(null);
    const [username, setUsername] = useState('');

    const handleLogin = (data) => {
        setToken(data.token);
        setUserID(data.userID); // فرض کنید این اطلاعات از سرور دریافت می‌شود
        setUsername(data.username);
    };

    return (
        <div>
            <h1>Welcome to Espandar</h1>
            {!token ? (
                <Auth onLogin={handleLogin} />
            ) : (
                <>
                    <Profile token={token} />
                    <Chat token={token} />
                </>
            )}
        </div>
    );
};

export default App;