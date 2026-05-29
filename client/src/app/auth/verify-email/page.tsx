"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVerifyEmail } from "@/hooks/useAuth";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { mutate: verify, isPending, isError, isSuccess } = useVerifyEmail();
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (token && !hasAttempted.current) {
      hasAttempted.current = true;
      verify(token);
    }
  }, [token, verify]);

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
              No verification token found. Please use the link from your email.
            </p>
            <Link href="/auth/register" className="btn-primary inline-block">
              ← BACK TO REGISTER
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Verifying (loading) ───────────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative">
          <div className="cb-card corner-tl p-7 text-center animate-fade-up">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-green-500/30 mb-6 animate-pulse-glow">
              <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-400 rounded-full"
                   style={{ animation: "spin-slow 1s linear infinite" }} />
            </div>

            <h2 className="font-mono text-lg font-bold text-green-400 tracking-widest mb-2">
              VERIFYING
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              Authenticating your identity<span className="animate-blink">_</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative">
          <div className="cb-card corner-tl p-7 text-center animate-fade-up">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

            <span className="text-4xl mb-4 block">❌</span>
            <h2 className="font-mono text-lg font-bold text-red-400 tracking-widest mb-3">
              VERIFICATION FAILED
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This link is invalid or has expired.
              <br />Please register again to get a new verification link.
            </p>
            <div className="space-y-3">
              <Link href="/auth/register" className="btn-primary w-full block text-center">
                REGISTER AGAIN →
              </Link>
              <Link href="/auth/login" className="btn-secondary w-full block text-center">
                ← LOGIN INSTEAD
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success (brief flash before redirect to /dashboard) ───────────────────
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
            <h2 className="font-mono text-lg font-bold text-green-400 tracking-widest mb-2">
              EMAIL VERIFIED
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              Redirecting to dashboard<span className="animate-blink">_</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
