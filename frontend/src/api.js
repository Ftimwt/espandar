import axios from 'axios';

const API_URL = 'http://localhost:8080';

export const signUp = async (userData) => {
 const response = await axios.post(`${API_URL}/signup`, userData);
 return response.data;
};

export const login = async (userData) => {
 const response = await axios.post(`${API_URL}/login`, userData);
 return response.data; // اطمینان حاصل کنید که توکن و اطلاعات کاربر در اینجا بازگشت داده می‌شود
};

export const getProfile = async (token) => {
 const response = await axios.get(`${API_URL}/profile`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
};

export const updateProfile = async (token, profileData) => {
    const response = await fetch('http://localhost:8080/api/profile', {
      method: 'PUT', // یا 'PATCH' بسته به پیاده‌سازی API شما
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
   
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
   
    return await response.json();
   };

// اضافه کردن توابع جدید برای مدیریت ویدیوکال
export const startVideoCall = async (token, otherUserID) => {
 const response = await axios.post(`${API_URL}/startPrivateCall`, { otherUserID }, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
};

export const joinVideoCall = async (token, roomID) => {
 const response = await axios.post(`${API_URL}/joinVideoCall`, { roomID }, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
};

// مدیریت پیام‌ها
export const getMessages = async (token, receiverType, receiverId) => {
 const response = await axios.get(`${API_URL}/messages/${receiverType}/${receiverId}`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
};

export const sendMessage = async (token, messageData) => {
 const response = await axios.post(`${API_URL}/message/${messageData.receiverType}/${messageData.receiverId}`, messageData, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
};

// توابع جدید برای مدیریت کانتکت‌ها
export const getContacts = async (token) => {
 console.log('getContacts: Sending request with token:', token);
 const response = await axios.get(`${API_URL}/contacts`, {
 headers: { Authorization: `Bearer ${token}` },
 });
 return response.data;
};

export const addContact = async (token, contact) => {
  console.log('addContact: Sending request with token:', token);
  const response = await axios.post(`${API_URL}/admin/contacts`, contact, {
      headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};