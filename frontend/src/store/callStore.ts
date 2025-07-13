import { create } from 'zustand';
import { useUserStore } from './userStore';

type CallState = {
  targetID: number;
  room: string;
  incoming: boolean;
  makeCall: (targetID: number) => void;
  startCall: (targetID: number, room: string) => void;
  receiveCall: (targetID: number, room: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  cancelCall: () => void;
};

export const userCallStore = create<CallState>((set, get) => ({
  targetID: 0,
  room: '',
  incoming: false,

  makeCall: (targetID) => {
    const { user } = useUserStore.getState();
    if (!user) return;

    const room = `room-${Date.now()}-${targetID}`;
    set({ targetID, room, incoming: false });

    window.ws?.send(JSON.stringify({
      type: "call_request",
      to: targetID,
      from: user.id,
      room: room,
    }));
  },

  startCall: (targetID, room) => {
    const { user } = useUserStore.getState();
    if (!user) return;

    set({ targetID, room, incoming: false });
  },

  receiveCall: (targetID, room) => {
    set({ targetID, room, incoming: true });
  },

  acceptCall: () => {
    const { targetID, room } = get();
    set({ incoming: false });
    window.ws?.send(JSON.stringify({
      type: 'call_response',
      from: targetID,
      room,
      status: 'accepted',
    }));
  },

  rejectCall: () => {
    const { targetID, room } = get();
    window.ws?.send(JSON.stringify({
      type: 'call_response',
      from: targetID,
      room,
      status: 'rejected',
    }));
    set({ targetID: 0, room: '', incoming: false });
  },

  cancelCall: () => {
    set({ targetID: 0, room: '', incoming: false });
  },
}));
