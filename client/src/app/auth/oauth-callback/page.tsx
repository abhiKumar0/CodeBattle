"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { connectStomp } from "@/lib/ws";
import toast from "react-hot-toast";

function OAuthCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;

    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const username = searchParams.get("username");
    const email = searchParams.get("email");
    const rating = searchParams.get("rating");
    const role = searchParams.get("role");

    if (token && userId && username && email && rating && role) {
      hasProcessed.current = true;

      const proceedAuth = async () => {
        try {
          setAuth({
            token,
            userId,
            username,
            email,
            rating: Number(rating),
            role,
          });
          await connectStomp(token);
          toast.success(`Welcome to CodeBattle, ${username}!`);
          router.push("/dashboard");
        } catch (err) {
          console.error("OAuth callback error:", err);
          toast.error("Failed to establish secure session.");
          router.push("/auth/login");
        }
      };

      proceedAuth();
    } else if (token || userId || username || email) {
      hasProcessed.current = true;
      toast.error("Invalid authentication response from provider.");
      router.push("/auth/login");
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-sm relative">
        <div className="cb-card corner-tl p-7 text-center animate-fade-up">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-green-500/30 mb-6 animate-pulse-glow">
            <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
          </div>

          <h2 className="font-mono text-lg font-bold text-green-400 tracking-widest mb-2">
            CONNECTING OPERATOR
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            Synchronizing secure tunnel<span className="animate-blink">_</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative">
          <div className="cb-card corner-tl p-7 text-center animate-fade-up">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
            <h2 className="font-mono text-lg font-bold text-green-400 tracking-widest mb-2 animate-pulse">
              INITIALIZING DECRYPTOR...
            </h2>
          </div>
        </div>
      </div>
    }>
      <OAuthCallbackHandler />
    </Suspense>
  );
}
