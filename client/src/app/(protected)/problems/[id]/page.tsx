"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { ProblemDetail, Language } from "@/types";

const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center font-mono text-xs text-muted-foreground animate-pulse">LOADING EDITOR...</div>,
});

const LANGS = [
  { value: "java", label: "Java" },
  { value: "python", label: "Python 3" },
  { value: "cpp", label: "C++" },
  { value: "javascript", label: "JavaScript" },
  { value: "c", label: "C" },
];

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const [lang, setLang] = useState<Language>("java");
  const [code, setCode] = useState("");

  const { data: problem, isLoading } = useQuery({
    queryKey: ["problem", id],
    queryFn: () => api.get<ProblemDetail>(`/api/problems/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const badgeClass: Record<string, string> = { EASY: "badge-easy", MEDIUM: "badge-medium", HARD: "badge-hard" };

  if (isLoading) return (
    <div className="h-[calc(100vh-3rem)] flex items-center justify-center">
      <p className="font-mono text-xs text-green-500 animate-pulse tracking-widest">LOADING PROBLEM...</p>
    </div>
  );
  if (!problem) return (
    <div className="h-[calc(100vh-3rem)] flex items-center justify-center">
      <p className="font-mono text-xs text-red-400">PROBLEM NOT FOUND</p>
    </div>
  );

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-11 border-b shrink-0 bg-card/50"
        style={{ borderBottomColor: "rgba(34,197,94,0.15)" }}>
        <Link href="/problems" className="text-muted-foreground hover:text-green-400 transition-colors">
          <ArrowLeft size={14} />
        </Link>
        <span className="font-display font-semibold text-sm">{problem.title}</span>
        <span className={`font-mono text-xs px-2 py-0.5 rounded ${badgeClass[problem.difficulty]}`}>{problem.difficulty}</span>
        <span className="font-mono text-xs text-muted-foreground hidden sm:block">{problem.topic}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground hidden sm:block">
          TIME: {problem.timeLimit}ms · MEM: {problem.memoryLimit}MB
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Problem */}
        <div className="w-[42%] border-r overflow-y-auto p-5 space-y-4 shrink-0"
          style={{ borderRightColor: "rgba(34,197,94,0.1)" }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{problem.description}</p>
          {problem.inputFormat && (
            <div>
              <p className="font-mono text-xs text-green-500 tracking-widest mb-1">INPUT</p>
              <p className="text-sm">{problem.inputFormat}</p>
            </div>
          )}
          {problem.outputFormat && (
            <div>
              <p className="font-mono text-xs text-green-500 tracking-widest mb-1">OUTPUT</p>
              <p className="text-sm">{problem.outputFormat}</p>
            </div>
          )}
          {problem.constraints && (
            <div>
              <p className="font-mono text-xs text-green-500 tracking-widest mb-1">CONSTRAINTS</p>
              <pre className="font-mono text-xs bg-muted/30 border border-border p-3 whitespace-pre-wrap">{problem.constraints}</pre>
            </div>
          )}
          {problem.sampleTestCases?.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-xs text-green-500 tracking-widest">EXAMPLES</p>
              {problem.sampleTestCases.map((tc, i) => (
                <div key={tc.id} className="border border-border overflow-hidden">
                  <div className="px-3 py-1.5 bg-muted/30 font-mono text-xs text-muted-foreground">EXAMPLE {i + 1}</div>
                  <div className="px-3 py-2 space-y-1 font-mono text-xs">
                    <div><span className="text-muted-foreground">IN:  </span>{tc.input}</div>
                    <div><span className="text-muted-foreground">OUT: </span><span className="text-green-400">{tc.expectedOutput}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0 bg-card/50"
            style={{ borderBottomColor: "rgba(34,197,94,0.1)" }}>
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)}
              className="font-mono text-xs bg-muted/50 border border-border px-2 py-1 focus:outline-none text-foreground">
              {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor language={lang} value={code} onChange={(v) => setCode(v ?? "")} />
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t shrink-0 bg-card/50"
            style={{ borderTopColor: "rgba(34,197,94,0.1)" }}>
            <p className="font-mono text-xs text-muted-foreground">PRACTICE MODE — results not judged</p>
            <Link href="/match/random" className="btn-primary text-xs">BATTLE WITH THIS →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
