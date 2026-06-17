import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse, LoginRequest, RegisterRequest } from "@/types";
import { disconnectStomp } from "@/lib/ws";
import { queryClient } from "@/lib/queryClient";

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<AuthResponse>("/api/auth/login", data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data);
      toast.success(`Welcome back, ${data.username}!`);
      router.push("/dashboard");
    },
    onError: () => toast.error("Invalid email or password"),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      api.post<{ message: string }>("/api/auth/register", data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || "Verification email sent!");
    },
    onError: () => toast.error("Registration failed. Username or email may be taken."),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ message: string }>("/api/auth/resend-verification", { email }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || "Verification email resent!");
    },
    onError: () => toast.error("Failed to resend verification email."),
  });
}

export function useVerifyEmail() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: (token: string) =>
      api.get<AuthResponse>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data);
      toast.success(`Email verified! Welcome, ${data.username}!`);
      router.push("/dashboard");
    },
    onError: () => toast.error("Email verification failed or link expired."),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post<{ message: string }>("/api/auth/forgot-password", { email }).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || "Password reset link sent!");
    },
    onError: () => toast.error("Failed to send password reset link."),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      api.post<{ message: string }>("/api/auth/reset-password", data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || "Password reset successfully!");
    },
    onError: () => toast.error("Failed to reset password. Link may be invalid or expired."),
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  return () => {
    disconnectStomp();
    // Clear ALL React Query cache — prevents friends/rooms/notifications
    // from the previous account bleeding into the next logged-in account
    queryClient.clear();
    clearAuth();
    router.push("/auth/login");
  };
}