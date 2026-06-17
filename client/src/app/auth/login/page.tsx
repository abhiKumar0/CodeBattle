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

          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-[hsl(220,18%,7%)] px-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Or authorize via
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/oauth2/authorization/google`}
              className="btn-secondary flex items-center justify-center gap-2 py-2 px-3 text-[11px] font-mono"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.866 1 .706 6.16.706 12.55s5.16 11.55 11.534 11.55c6.657 0 11.08-4.685 11.08-11.275 0-.76-.08-1.343-.18-1.84H12.24z"/>
              </svg>
              GOOGLE
            </button>
            <button
              type="button"
              onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/oauth2/authorization/github`}
              className="btn-secondary flex items-center justify-center gap-2 py-2 px-3 text-[11px] font-mono"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              GITHUB
            </button>
          </div>

          <div className="mt-2 pt-2 text-center">
            <p className="font-mono text-xs text-muted-foreground">
              Forgot Password?{" "}
              <Link href="/auth/forgot-password" className="text-green-400 hover:text-green-300 transition-colors">
                Reset Password
              </Link>
            </p>
            <p className="mt-4 pt-4 border-t border-border text-center font-mono text-xs text-muted-foreground">
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
