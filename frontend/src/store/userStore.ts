import { create } from 'zustand';

interface UserState {
  username: string | null;
  isLoggedIn: boolean;
  login: (username: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  username: null,
  isLoggedIn: false,
  login: (username) => set({ username, isLoggedIn: true }),
  logout: () => set({ username: null, isLoggedIn: false }),
}));
