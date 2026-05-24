import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthResponse } from "@/types";

interface AuthState {
  token: string | null;
  userId: string | null;
  username: string | null;
  email: string | null;
  rating: number;
  role: string | null;
  isAuthenticated: boolean;
  setAuth: (data: AuthResponse) => void;
  clearAuth: () => void;
  updateRating: (rating: number) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      email: null,
      rating: 1200,
      role: null,
      isAuthenticated: false,

      setAuth: (data) => {
        localStorage.setItem("token", data.token);
        set({
          token: data.token,
          userId: data.userId,
          username: data.username,
          email: data.email,
          rating: data.rating,
          role: data.role,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        localStorage.removeItem("token");
        set({
          token: null,
          userId: null,
          username: null,
          email: null,
          rating: 1200,
          role: null,
          isAuthenticated: false,
        });
      },

      updateRating: (rating) => set({ rating }),
    }),
    { name: "auth-storage" }
  )
);
