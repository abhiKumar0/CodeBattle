"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRegister } from "@/hooks/useAuth";

const schema = z.object({
  username: z.string().min(3, "Min 3 characters").max(20, "Max 20 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { mutate: register_, isPending } = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 rounded-xl border border-border bg-card shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">CodeBattle ⚔️</h1>
        <p className="text-muted-foreground text-center mb-8">Create your account</p>

        <form onSubmit={handleSubmit((d) => register_(d))} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Username</label>
            <input
              {...register("username")}
              placeholder="coderX"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.username && (
              <p className="text-destructive text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && (
              <p className="text-destructive text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.password && (
              <p className="text-destructive text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
