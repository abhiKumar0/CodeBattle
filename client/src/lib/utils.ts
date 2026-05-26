import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Difficulty } from "@/types";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function difficultyColor(d: Difficulty) {
  return d === "EASY" ? "text-green-500" : d === "MEDIUM" ? "text-yellow-500" : "text-red-500";
}

export function difficultyBg(d: string) {
  return d === "EASY"
    ? "bg-green-500/10 text-green-500"
    : d === "MEDIUM"
    ? "bg-yellow-500/10 text-yellow-500"
    : "bg-red-500/10 text-red-500";
}

export function statusColor(status: string) {
  switch (status) {
    case "ACCEPTED": return "text-green-500";
    case "WRONG_ANSWER": return "text-red-500";
    case "TIME_LIMIT_EXCEEDED": return "text-yellow-500";
    case "COMPILE_ERROR": return "text-orange-500";
    case "RUNTIME_ERROR": return "text-red-400";
    case "RUNNING":
    case "PENDING": return "text-blue-400";
    default: return "text-muted-foreground";
  }
}

export function formatRatingDelta(delta: number) {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
