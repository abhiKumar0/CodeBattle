import { create } from "zustand";
import { RoomResponse, SubmissionStatus, Language } from "@/types";

interface OpponentActivity {
  isRunning: boolean;
  lastStatus: SubmissionStatus | null;
  executionTime: number | null;
}

interface RoomState {
  room: RoomResponse | null;
  selectedLanguage: Language;
  code: string;
  isSubmitting: boolean;
  opponentActivity: OpponentActivity;

  setRoom: (room: RoomResponse) => void;
  updateRoomStatus: (updates: Partial<RoomResponse>) => void;
  setLanguage: (lang: Language) => void;
  setCode: (code: string) => void;
  setSubmitting: (val: boolean) => void;
  setOpponentActivity: (activity: Partial<OpponentActivity>) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  selectedLanguage: "java",
  code: "",
  isSubmitting: false,
  opponentActivity: {
    isRunning: false,
    lastStatus: null,
    executionTime: null,
  },

  setRoom: (room) => set({ room }),
  updateRoomStatus: (updates) =>
    set((state) => ({
      room: state.room ? { ...state.room, ...updates } : null,
    })),
  setLanguage: (selectedLanguage) => set({ selectedLanguage }),
  setCode: (code) => set({ code }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setOpponentActivity: (activity) =>
    set((state) => ({
      opponentActivity: { ...state.opponentActivity, ...activity },
    })),
  clearRoom: () =>
    set({
      room: null,
      code: "",
      isSubmitting: false,
      opponentActivity: { isRunning: false, lastStatus: null, executionTime: null },
    }),
}));
