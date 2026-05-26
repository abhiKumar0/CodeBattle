import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { connectStomp, disconnectStomp } from "@/lib/ws";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse, LoginRequest, RegisterRequest } from "@/types";

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
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      api.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),
    onSuccess: async (data) => {
      setAuth(data);
      await connectStomp(data.token);
      toast.success("Account created!");
      router.push("/dashboard");
    },
    onError: () => toast.error("Registration failed. Username or email may be taken."),
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
