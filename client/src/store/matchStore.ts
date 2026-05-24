import { create } from "zustand";
import { MatchStatus } from "@/types";

interface MatchState {
  status: MatchStatus;
  queueSize: number;
  message: string;
  setStatus: (status: MatchStatus) => void;
  setQueueSize: (size: number) => void;
  setMessage: (msg: string) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  status: "IDLE",
  queueSize: 0,
  message: "",
  setStatus: (status) => set({ status }),
  setQueueSize: (queueSize) => set({ queueSize }),
  setMessage: (message) => set({ message }),
  reset: () => set({ status: "IDLE", queueSize: 0, message: "" }),
}));
