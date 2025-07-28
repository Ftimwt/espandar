import { create } from 'zustand';

type OnlineUserStore = {
  onlineUsers: Set<number>;
  setOnline: (id: number) => void;
  setOffline: (id: number) => void;
};

export const useOnlineUserStore = create<OnlineUserStore>((set) => ({
  onlineUsers: new Set(),
  setOnline: (id) =>
    set((state) => {
      const setCopy = new Set(state.onlineUsers);
      setCopy.add(id);
      return { onlineUsers: setCopy };
    }),
  setOffline: (id) =>
    set((state) => {
      const setCopy = new Set(state.onlineUsers);
      setCopy.delete(id);
      return { onlineUsers: setCopy };
    }),
}));
