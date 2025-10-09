import { create } from 'zustand';

interface UserState {
  user: UserModel | null;
  isLoggedIn: boolean;
  login: (user: UserModel) => void;
  logout: () => void;
  updateProfile: (user: Partial<UserModel>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoggedIn: false,
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),
  updateProfile: (user) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : state.user,
    })),
}));