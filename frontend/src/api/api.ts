import axios from 'axios';

export const prefixUrl = (url: string) => {
  let prefix = `${import.meta.env.VITE_API_PREFIX}` || '/';
  if (!prefix.endsWith('/')) {
    prefix += '/';
  }

  return `${prefix}${url}`;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_PREFIX || '/',
});