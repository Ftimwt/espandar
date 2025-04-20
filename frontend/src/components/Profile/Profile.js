// Profile.js
import React, { useEffect, useState } from 'react';
import { getProfile, updateProfile } from '../../api'; // فرض بر این است که این تابع از api.js وارد شده است
import './Profile.css'; // وارد کردن CSS مخصوص این کامپوننت

const Profile = ({ token }) => {
    const [profileData, setProfileData] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const data = await getProfile(token);
            setProfileData(data);
            setUsername(data.username);
            setEmail(data.email); // فرض بر این است که email در داده‌های پروفایل وجود دارد
            setPhoneNumber(data.phoneNumber); // فرض بر این است که phoneNumber در داده‌های پروفایل وجود دارد
        };
        fetchProfile();
    }, [token]);

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleSave = async () => {
        // مدیریت ذخیره تغییرات پروفایل
        await updateProfile(token, { username, email, phoneNumber });
        setEditMode(false);
        // دوباره بارگذاری داده‌های پروفایل بعد از ذخیره تغییرات
        const data = await getProfile(token);
        setProfileData(data);
    };

    return (
        <div className="profile-container">
            <div className="toolbar">
                <button onClick={() => {/* تابع خروج از حساب کاربری */}}>Logout</button>
            </div>
            <h2>Profile</h2>
            {editMode ? (
                <div>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                    />
                    <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="Phone Number"
                    />
                    <button onClick={handleSave}>Save</button>
                </div>
            ) : (
                <div>
                    <p>Username: {profileData?.username}</p>
                    <p>Email: {profileData?.email}</p>
                    <p>Phone Number: {profileData?.phoneNumber}</p>
                    <button onClick={handleEdit}>Edit Profile</button>
                </div>
            )}
        </div>
    );
};

export default Profile;