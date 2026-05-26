"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Terminal } from "lucide-react";
import api from "@/lib/api";
import { ProblemSummary, Difficulty } from "@/types";

export default function ProblemsPage() {
  const [search, setSearch] = useState("");
  const [diff, setDiff] = useState<Difficulty | "ALL">("ALL");

  const { data: problems = [], isLoading } = useQuery({
    queryKey: ["problems"],
    queryFn: () => api.get<ProblemSummary[]>("/api/problems").then((r) => r.data),
  });

  const filtered = problems.filter((p) => {
    const s = p.title.toLowerCase().includes(search.toLowerCase()) || p.topic.toLowerCase().includes(search.toLowerCase());
    return s && (diff === "ALL" || p.difficulty === diff);
  });

  const badgeClass: Record<string, string> = { EASY: "badge-easy", MEDIUM: "badge-medium", HARD: "badge-hard" };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="animate-fade-up">
        <p className="font-mono text-xs text-green-500 tracking-widest">// PROBLEM ARCHIVE</p>
        <h1 className="font-display text-4xl font-bold mt-1 flex items-center gap-3">
          <Terminal className="text-green-400" size={30} />
          ARENA
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          {problems.length} PROBLEMS AVAILABLE
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap animate-fade-up">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH PROBLEMS..."
            className="cb-input pl-8" />
        </div>
        <div className="flex gap-1.5">
          {(["ALL", "EASY", "MEDIUM", "HARD"] as const).map((d) => (
            <button key={d} onClick={() => setDiff(d)}
              className={`font-mono text-xs tracking-widest px-3 py-2 border transition-all duration-200 ${
                diff === d
                  ? d === "ALL" ? "border-green-500/60 text-green-400 bg-green-500/10"
                    : d === "EASY" ? "badge-easy border-green-500/60"
                    : d === "MEDIUM" ? "badge-medium border-yellow-500/60"
                    : "badge-hard border-red-500/60"
                  : "border-border text-muted-foreground hover:border-green-500/30"
              }`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="cb-card overflow-hidden animate-fade-up">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />
        {isLoading ? (
          <div className="p-12 text-center font-mono text-xs text-muted-foreground animate-pulse">LOADING PROBLEMS...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-muted-foreground">NO PROBLEMS MATCH YOUR FILTER</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left font-mono text-xs text-muted-foreground tracking-widest">PROBLEM</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-muted-foreground tracking-widest hidden md:table-cell">TOPIC</th>
                <th className="px-5 py-3 text-left font-mono text-xs text-muted-foreground tracking-widest">LEVEL</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-green-500/3 transition-colors group">
                  <td className="px-5 py-4">
                    <span className="font-display font-semibold text-sm group-hover:text-green-400 transition-colors">
                      {p.title}
                    </span>
                    {p.isDaily && <span className="ml-2 font-mono text-xs text-green-500">[DAILY]</span>}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{p.topic}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`font-mono text-xs px-2 py-0.5 rounded ${badgeClass[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/problems/${p.id}`}
                      className="font-mono text-xs text-green-400 hover:text-green-300 tracking-widest transition-colors opacity-0 group-hover:opacity-100">
                      SOLVE →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
