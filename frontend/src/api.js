import axios from 'axios';

const API_URL = 'http://localhost:8080';

// تنظیم Interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request headers:', config.headers);
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
  const response = await fetch(`${API_URL}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    throw new Error('Failed to update profile');
  }

  return await response.json();
};

// api.js
export const startCall = async (token, otherUserID, callType = 'video') => {
  try {
    const response = await axios.post(
      `${API_URL}/startCall`,
      { otherUserID: parseInt(otherUserID,10),
         callType
         },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('startCall response:', response.data);
    if (!response.data) {
      throw new Error('No data returned from startCall API');
    }
    return response.data;
  } catch (error) {
    console.error('startCall error:', error.response?.data || error.message);
    throw error;
  }
};

export const joinCall = async (token, data) => {
  try {
    const response = await axios.post(
      `${API_URL}/joinCall`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('joinCall response:', response.data);
    return response.data;
  } catch (error) {
    console.error('joinCall error:', error.response?.data || error.message);
    throw error;
  }
};

export const getMessages = async (token, receiverType, receiverId) => {
  try {
    const response = await axios.get(`${API_URL}/messages/${receiverType}/${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error in getMessages:', error.response?.data || error.message);
    throw error;
  }
};
export const sendMessage = async (token, receiverType, receiverId, messageData) => {
  try{
    const response = await axios.post(`${API_URL}/messages/${receiverType}/${receiverId}`, 
      messageData,
    {
      headers: { Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data',
     },
    }
  );
console.log('sendMessage response:', response.data);
    return response.data;
  } catch (error) {
    console.error('sendMessage error:', error.response?.data || error.message);
    throw error;
  }
};

export const markMessageAsSeen = async (token, messageId) => {
  try {
    await axios.post(`${API_URL}/messages/${messageId}/seen`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Message ${messageId} marked as seen`);
  } catch (error) {
    console.error('Error in markMessageAsSeen:', error.response?.data || error.message);
    throw error;
  }
};

export const getContacts = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/contacts`, {
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
};export const createChannel = async (token, channel) => {
  console.log('createChannel: Sending request with token:', token);
  const response = await axios.post(`${API_URL}/channel`, channel, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getChannels = async (token) => {
  try {
    console.log('getChannels: sending request with token:', token);
    const response = await axios.get(`${API_URL}/channels?perpage=20&page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Error in getChannels:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};