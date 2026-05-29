"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRegister, useResendVerification } from "@/hooks/useAuth";

const schema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { mutate: register_, isPending } = useRegister();
  const { mutate: resend, isPending: isResending } = useResendVerification();
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = (data: FormData) => {
    register_(data, {
      onSuccess: () => {
        setSentTo(data.email);
        startCooldown();
      },
    });
  };

  const handleResend = () => {
    if (!sentTo || cooldown > 0) return;
    resend(sentTo, { onSuccess: () => startCooldown() });
  };

  // ─── "Check your email" state ──────────────────────────────────────────────
  if (sentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-sm relative">
          <div className="text-center mb-10 animate-fade-up">
            <div className="inline-flex items-center justify-center w-14 h-14 border border-green-500/40 rotate-45 mb-6 relative">
              <span className="text-2xl -rotate-45 relative z-10">✉️</span>
              <div className="absolute inset-0 bg-green-500/5" />
            </div>
            <h1 className="font-mono text-2xl font-bold text-green-400 tracking-widest glow-text">
              VERIFY EMAIL
            </h1>
            <p className="text-muted-foreground text-xs font-mono mt-2 tracking-wider">
              ALMOST THERE, OPERATOR
            </p>
          </div>

          <div className="cb-card corner-tl p-7 animate-fade-up stagger-1">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-green-500/30 mb-2">
                <span className="text-3xl animate-pulse-glow rounded-full p-2">📧</span>
              </div>

              <p className="text-sm text-foreground">
                We sent a verification link to
              </p>
              <p className="font-mono text-green-400 text-sm break-all">
                {sentTo}
              </p>
              <p className="text-xs text-muted-foreground">
                Click the link in the email to activate your account.
                <br />The link expires in 15 minutes.
              </p>

              <div className="pt-4 space-y-3">
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                  className="btn-primary w-full"
                >
                  {isResending
                    ? "SENDING..."
                    : cooldown > 0
                      ? `RESEND IN ${cooldown}s`
                      : "RESEND EMAIL →"}
                </button>

                <button
                  onClick={() => setSentTo(null)}
                  className="btn-secondary w-full"
                >
                  ← USE DIFFERENT EMAIL
                </button>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="font-mono text-xs text-muted-foreground">
                ALREADY VERIFIED?{" "}
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

  // ─── Registration form (original) ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-green-500/40 rotate-45 mb-6 relative">
            <span className="text-2xl -rotate-45 relative z-10">⚔️</span>
            <div className="absolute inset-0 bg-green-500/5" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-green-400 tracking-widest glow-text">CODEBATTLE</h1>
          <p className="text-muted-foreground text-xs font-mono mt-2 tracking-wider">CREATE YOUR OPERATOR PROFILE</p>
        </div>

        <div className="cb-card corner-tl p-7 animate-fade-up stagger-1">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

          <form onSubmit={handleSubmit(handleRegister)} className="space-y-5">
            <div>
              <label className="block font-mono text-xs text-muted-foreground tracking-widest mb-2 uppercase">Username</label>
              <input {...register("username")} placeholder="operator_x"
                className="cb-input" />
              {errors.username && <p className="font-mono text-xs text-red-400 mt-1">// {errors.username.message}</p>}
            </div>
            <div>
              <label className="block font-mono text-xs text-muted-foreground tracking-widest mb-2 uppercase">Email</label>
              <input {...register("email")} type="email" placeholder="operator@arena.io"
                className="cb-input" />
              {errors.email && <p className="font-mono text-xs text-red-400 mt-1">// {errors.email.message}</p>}
            </div>
            <div>
              <label className="block font-mono text-xs text-muted-foreground tracking-widest mb-2 uppercase">Password</label>
              <input {...register("password")} type="password" placeholder="••••••••"
                className="cb-input" />
              {errors.password && <p className="font-mono text-xs text-red-400 mt-1">// {errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isPending}
              className="btn-primary w-full mt-2">
              {isPending ? "INITIALIZING..." : "CREATE PROFILE →"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="font-mono text-xs text-muted-foreground">
              ALREADY REGISTERED?{" "}
              <Link href="/auth/login" className="text-green-400 hover:text-green-300 transition-colors">LOGIN</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
