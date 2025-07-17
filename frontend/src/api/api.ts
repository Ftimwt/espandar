import axios from 'axios';

export const prefixUrl = (url: string) => {
  let prefix = `${import.meta.env.VITE_API_PREFIX}` || '/';
  if (!prefix.endsWith('/')) {
    prefix += '/';
  }

  if (url.startsWith('/')) {
    url = url.slice(1);
  }

  return `${prefix}${url}`;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_PREFIX || '/',
});

export const authClient = (token: string) =>
  axios.create({
    baseURL: import.meta.env.VITE_API_PREFIX || '/',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
  });