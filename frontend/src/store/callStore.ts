import {create} from "zustand";

interface CallState {
  targetID: number;
  makeCall: (targetID: number) => void;
  cancelCall: () => void;
}

export const userCallStore = create<CallState>((set) => ({
  targetID: 0,
  makeCall: (targetID: number) => set({targetID}),
  cancelCall: () => set({targetID: 0}),
}));
