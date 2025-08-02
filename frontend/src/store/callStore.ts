import {create} from 'zustand';
import {useUserStore} from './userStore';

type CallState = {
  targetID: number[];
  room: string;
  incoming: boolean;
  makeCall: (targetID: number) => void;
  startCall: (targetID: number, room: string) => void;
  receiveCall: (targetID: number, room: string) => void;
  makeRoom: (room: string, roomMembers: number[]) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  cancelCall: () => void;
};

export const userCallStore = create<CallState>((set, get) => ({
  targetID: [],
  room: '',
  incoming: false,

  makeRoom: (room: string, roomMembers: number[]) => {
    const {user} = useUserStore.getState();
    if (!user) return;

    set({targetID: roomMembers, room, incoming: false});

    for (const roomMember of roomMembers) {
      window.ws?.send(JSON.stringify({
        type: "call_request",
        to: roomMember,
        from: user.id,
        room: room,
      }));
    }
  },

  makeCall: (targetID) => {
    const {user} = useUserStore.getState();
    if (!user) return;
    const room = `room-${Date.now()}_${targetID}`;
    get().makeRoom(room, [targetID]);
  },

  startCall: (targetID, room) => {
    const {user} = useUserStore.getState();
    if (!user) return;

    set({targetID: [targetID], room, incoming: false});
  },

  receiveCall: (targetID, room) => {
    set({targetID: [targetID], room, incoming: true});
  },

  acceptCall: () => {
    const {targetID, room} = get();
    set({incoming: false});
    window.ws?.send(JSON.stringify({
      type: 'call_response',
      from: targetID,
      room,
      status: 'accepted',
    }));
  },

  rejectCall: () => {
    const {targetID, room} = get();
    window.ws?.send(JSON.stringify({
      type: 'call_response',
      from: targetID,
      room,
      status: 'rejected',
    }));
    set({targetID: [], room: '', incoming: false});
  },

  cancelCall: () => {
    set({targetID: [], room: '', incoming: false});
  },
}));
