// Profile.js
import React, { useEffect, useState } from 'react';
import { getProfile } from '../../api'; // فرض بر این است که این تابع از api.js وارد شده است
import './Profile.css'; // وارد کردن CSS مخصوص این کامپوننت

const Profile = ({ token }) => {
  const [profileData, setProfileData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const data = await getProfile(token);
      setProfileData(data);
      setUsername(data.username); // فرض بر این است که username در داده‌های پروفایل وجود دارد
    };
    fetchProfile();
  }, [token]);

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = async () => {
    // مدیریت ذخیره تغییرات پروفایل (به عنوان مثال با استفاده از یک API)
    // در اینجا می‌توانید یک API برای ویرایش پروفایل اضافه کنید
    setEditMode(false);
  };

  return (
    <div>
      <h2>Profile</h2>
      {editMode ? (
        <div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
        </div>
      ) : (
        <div>
          <p>Username: {profileData?.username}</p>
          <button onClick={handleEdit}>Edit Profile</button>
        </div>
      )}
      <button onClick={() => {/* مسیر به صفحه چت جدید */}}>Start New Chat</button>
    </div>
  );
};

export default Profile;