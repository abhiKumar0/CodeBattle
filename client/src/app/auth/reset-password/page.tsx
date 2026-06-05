"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useResetPassword } from "@/hooks/useAuth";

const schema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { mutate: reset, isPending, isSuccess, isError } = useResetPassword();

  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    if (!token) return;
    reset({ token, newPassword: data.newPassword });
  };

  // ─── No token in URL ──────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative">
          <div className="cb-card corner-tl p-7 text-center animate-fade-up">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="font-mono text-lg font-bold text-red-400 tracking-widest mb-3">
              MISSING TOKEN
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              No reset token found. Please use the link from your email.
            </p>
            <Link href="/auth/forgot-password" className="btn-primary inline-block">
              ← REQUEST NEW LINK
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success state ─────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative">
          <div className="cb-card corner-tl p-7 text-center animate-fade-up">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
            <span className="text-4xl mb-4 block">✅</span>
            <h2 className="font-mono text-lg font-bold text-green-400 tracking-widest mb-3">
              PASSWORD RESET
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your password has been updated successfully.
            </p>
            <Link href="/auth/login" className="btn-primary w-full block text-center">
              LOGIN WITH NEW PASSWORD →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Reset form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-green-500/40 rotate-45 mb-6 relative">
            <span className="text-2xl -rotate-45 relative z-10">🔒</span>
            <div className="absolute inset-0 bg-green-500/5" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-green-400 tracking-widest glow-text">
            NEW PASSWORD
          </h1>
          <p className="text-muted-foreground text-xs font-mono mt-2 tracking-wider">
            ENTER YOUR NEW PASSWORD BELOW
          </p>
        </div>

        <div className="cb-card corner-tl p-7 animate-fade-up stagger-1">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

          {isError && (
            <div className="mb-5 p-3 border border-red-500/30 rounded bg-red-500/5 text-center">
              <p className="font-mono text-xs text-red-400">
                Reset failed. The link may be invalid or expired.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block font-mono text-xs text-muted-foreground tracking-widest mb-2 uppercase">
                New Password
              </label>
              <input
                {...register("newPassword")}
                type="password"
                placeholder="••••••••"
                className="cb-input"
              />
              {errors.newPassword && (
                <p className="font-mono text-xs text-red-400 mt-1">// {errors.newPassword.message}</p>
              )}
            </div>
            <div>
              <label className="block font-mono text-xs text-muted-foreground tracking-widest mb-2 uppercase">
                Confirm Password
              </label>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="••••••••"
                className="cb-input"
              />
              {errors.confirmPassword && (
                <p className="font-mono text-xs text-red-400 mt-1">// {errors.confirmPassword.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full mt-2"
            >
              {isPending ? "RESETTING..." : "SET NEW PASSWORD →"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="font-mono text-xs text-muted-foreground">
              REMEMBER YOUR PASSWORD?{" "}
              <Link href="/auth/login" className="text-green-400 hover:text-green-300 transition-colors">
                LOGIN
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
          </div>
          <div className="w-full max-w-sm relative">
            <div className="cb-card corner-tl p-7 text-center animate-fade-up">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
              <h2 className="font-mono text-lg font-bold text-green-400 tracking-widest mb-2 animate-pulse">
                LOADING PASSWORD RESET...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
