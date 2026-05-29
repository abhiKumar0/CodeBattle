import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { connectStomp, disconnectStomp } from "@/lib/ws";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse, LoginRequest, MessageResponse, RegisterRequest } from "@/types";

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api.post<AuthResponse>("/api/auth/login", data).then((r) => r.data),
    onSuccess: async (data) => {
      setAuth(data);
      await connectStomp(data.token);
      toast.success(`Welcome back, ${data.username}!`);
      router.push("/dashboard");
    },
    onError: () => toast.error("Invalid email or password"),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      api.post<MessageResponse>("/api/auth/register", data).then((r) => r.data),
    onError: () => toast.error("Registration failed. Username or email may be taken."),
  });
}

export function useVerifyEmail() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: (token: string) =>
      api.get<AuthResponse>("/api/auth/verify-email", { params: { token } }).then((r) => r.data),
    onSuccess: async (data) => {
      setAuth(data);
      await connectStomp(data.token);
      toast.success(`Welcome to CodeBattle, ${data.username}!`);
      router.push("/dashboard");
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post<MessageResponse>("/api/auth/resend-verification", { email }).then((r) => r.data),
    onSuccess: () => toast.success("Verification email resent!"),
    onError: () => toast.error("Failed to resend. Please try registering again."),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post<MessageResponse>("/api/auth/forgot-password", { email }).then((r) => r.data),
    onSuccess: (data) => toast.success(data.message),
    // Always show success to prevent email enumeration
    onError: () => toast.success("If an account with that email exists, a reset link has been sent."),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      api.post<MessageResponse>("/api/auth/reset-password", data).then((r) => r.data),
    onSuccess: (data) => toast.success(data.message),
    onError: () => toast.error("Reset failed. The link may be invalid or expired."),
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  return () => {
    disconnectStomp();
    clearAuth();
    router.push("/auth/login");
  };
}
