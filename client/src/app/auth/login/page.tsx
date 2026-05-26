"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLogin } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center w-14 h-14 border border-green-500/40 rotate-45 mb-6 relative">
            <span className="text-2xl -rotate-45 relative z-10">⚔️</span>
            <div className="absolute inset-0 bg-green-500/5" />
          </div>
          <h1 className="font-mono text-2xl font-bold text-green-400 tracking-widest glow-text">CODEBATTLE</h1>
          <p className="text-muted-foreground text-xs font-mono mt-2 tracking-wider">AUTHENTICATE TO ENTER THE ARENA</p>
        </div>

        {/* Card */}
        <div className="cb-card corner-tl p-7 animate-fade-up stagger-1">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
          
          <form onSubmit={handleSubmit((d) => login(d))} className="space-y-5">
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
              {isPending ? "AUTHENTICATING..." : "ENTER ARENA →"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="font-mono text-xs text-muted-foreground">
              NO ACCOUNT?{" "}
              <Link href="/auth/register" className="text-green-400 hover:text-green-300 transition-colors">
                REGISTER
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
