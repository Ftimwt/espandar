import axios from 'axios';

const API_URL = 'http://localhost:8080';

// تنظیم Interceptor
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log('Request headers:', config.headers); // برای دیباگ
        return config;
    },
    (error) => Promise.reject(error)
);

export const signUp = async (userData) => {
    try {
        const url = userData.role === 'admin' ? `${API_URL}/admin/signup` : `${API_URL}/signup`;
        const response = await axios.post(url, userData);
        if (!response.data.token || !response.data.user_id) {
            throw new Error('Invalid response: token or user_id missing');
        }
        console.log('signUp response:', response.data);
        return response.data;
    } catch (error) {
        console.error('signUp error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw error;
    }
};

export const login = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/login`, userData);
        if (!response.data.token || !response.data.user_id) {
            throw new Error('Invalid response: token or user_id missing');
        }
        console.log('login response:', response.data);
        return response.data;
    } catch (error) {
        console.error('login error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        throw error;
    }
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
    try {
        const response = await axios.get('http://localhost:8080/contacts', {
            headers: { Authorization: `Bearer ${token}` },
        });
        console.log('getContacts response:', response.data);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error in getContacts:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
        });
        return [];
    }
};

export const addContact = async (token, contact) => {
    console.log('addContact: Sending request with token:', token);
    const response = await axios.post(`${API_URL}/admin/contacts`, contact, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

/**
 *
 * @param token {string}
 * @param channel {{name: string, description?: string, members: number[]}}
 * @returns {Promise<{}>}
 */
export const createChannel = async (token, channel) => {
    console.log('createChannel: Sending request with token:', token);
    const response = await axios.post(`${API_URL}/channel`, channel, {});
    return response.data;
}

export const getChannels = async (token) => {
    try {
        console.log("getChannels: sending request with token:", token);
        const response = await axios.get(`${API_URL}/channels?perpage=20&page=1`, {});
        return response.data;
    } catch (error) {
        console.error('Error in getChannels:', {
            message: error.message,
            response: error.response?.error,
            status: error.response?.status,
        });
    }
}