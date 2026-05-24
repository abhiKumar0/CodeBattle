import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Difficulty } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function difficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "EASY":   return "text-green-500";
    case "MEDIUM": return "text-yellow-500";
    case "HARD":   return "text-red-500";
  }
}

export function difficultyBg(difficulty: Difficulty): string {
  switch (difficulty) {
    case "EASY":   return "bg-green-500/10 text-green-500";
    case "MEDIUM": return "bg-yellow-500/10 text-yellow-500";
    case "HARD":   return "bg-red-500/10 text-red-500";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "ACCEPTED":            return "text-green-500";
    case "WRONG_ANSWER":        return "text-red-500";
    case "TIME_LIMIT_EXCEEDED": return "text-yellow-500";
    case "COMPILE_ERROR":       return "text-orange-500";
    case "RUNTIME_ERROR":       return "text-red-400";
    case "RUNNING":
    case "PENDING":             return "text-blue-400";
    default:                    return "text-muted-foreground";
  }
}

export function formatRatingDelta(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}
