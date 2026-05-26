"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "hsl(220, 18%, 7%)",
            color: "hsl(150, 20%, 90%)",
            border: "1px solid rgba(34,197,94,0.25)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.05em",
            borderRadius: "2px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "hsl(220, 18%, 7%)" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "hsl(220, 18%, 7%)" } },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
