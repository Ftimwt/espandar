import axios from 'axios';

const API_URL = 'http://localhost:8080';

export const signUp = async (userData) => {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
};

export const login = async (userData) => {
    const response = await axios.post(`${API_URL}/login`, userData);
    return response.data;
};

export const getProfile = async (token) => {
    const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

// اضافه کردن توابع جدید
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