// store.ts (Zustand example)
import {create} from "zustand";

interface GlobalState {
  submission: any; // replace `any` with your real type
  setSubmission: (submission: any) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  submission: null,
  setSubmission: (submission) => set({ submission }),
}));
