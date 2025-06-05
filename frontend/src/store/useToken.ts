import {create} from 'zustand';

interface UserState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
}

export const useTokenStore = create<UserState>((set) => ({
  token: localStorage.getItem('token'),
  setToken: (token: string) => {
    localStorage.setItem('token', token!);
    set({token});
  },
  clearToken: () => {
    localStorage.removeItem('token');
    set({token: null});
  }
}));
