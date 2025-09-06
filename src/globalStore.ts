// store.ts (Zustand example)
import {create} from "zustand";

interface GlobalState {
  submission: any; // replace `any` with your real type
  setSubmission: (submission: any) => void;
  adminSettings: any;
  setAdminSettings: (settings: any) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  submission: null,
  setSubmission: (submission) => set({ submission }),
  adminSettings: null,
  setAdminSettings: (settings) => set({ adminSettings: settings }),
}));
