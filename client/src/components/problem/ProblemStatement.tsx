"use client";

import { Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { ProblemDetail } from "@/types";

interface Props {
  problem: ProblemDetail;
}

export default function ProblemStatement({ problem }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const badgeClass: Record<string, string> = {
    EASY: "badge-easy",
    MEDIUM: "badge-medium",
    HARD: "badge-hard",
  };

  return (
    <div className="space-y-5">
      {/* Title + metadata */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-display text-xl font-bold">{problem.title}</h2>
          <span className={`font-mono text-xs px-2 py-0.5 rounded ${badgeClass[problem.difficulty] ?? "badge-easy"}`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-2 font-mono text-xs text-muted-foreground">
          <span>⏱ TIME LIMIT: {problem.timeLimit}ms</span>
          <span>💾 MEMORY: {problem.memoryLimit}MB</span>
          {problem.topic && <span>📂 {problem.topic.toUpperCase()}</span>}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-green-500/30 via-green-500/10 to-transparent" />

      {/* Statement */}
      <div>
        <p className="font-mono text-xs text-green-500 tracking-widest mb-2">STATEMENT</p>
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {problem.description}
        </div>
      </div>

      {/* Input Format */}
      {problem.inputFormat && (
        <div className="cb-card p-4 border-l-2 border-l-cyan-500/40">
          <p className="font-mono text-xs text-cyan-400 tracking-widest mb-2 font-bold">INPUT FORMAT</p>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{problem.inputFormat}</div>
        </div>
      )}

      {/* Output Format */}
      {problem.outputFormat && (
        <div className="cb-card p-4 border-l-2 border-l-green-500/40">
          <p className="font-mono text-xs text-green-400 tracking-widest mb-2 font-bold">OUTPUT FORMAT</p>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{problem.outputFormat}</div>
        </div>
      )}

      {/* Constraints */}
      {problem.constraints && (
        <div className="cb-card p-4 border-l-2 border-l-yellow-500/40">
          <p className="font-mono text-xs text-yellow-400 tracking-widest mb-2 font-bold">CONSTRAINTS</p>
          <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80">
            {problem.constraints.split("\n").map((line, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5">
                <span className="text-yellow-500/60 shrink-0">•</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {problem.sampleTestCases?.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-xs text-green-500 tracking-widest font-bold">EXAMPLES</p>
          {problem.sampleTestCases.map((tc, i) => (
            <div key={tc.id} className="cb-card overflow-hidden">
              <div className="px-4 py-2 bg-muted/30 flex items-center justify-between border-b border-border">
                <span className="font-mono text-xs text-muted-foreground font-bold tracking-wider">
                  EXAMPLE {i + 1}
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Input */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-cyan-400 tracking-widest">INPUT</span>
                    <button
                      onClick={() => copyText(tc.input, i * 2)}
                      className="p-0.5 text-muted-foreground hover:text-green-400 transition-colors"
                    >
                      {copiedIdx === i * 2 ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <pre className="font-mono text-xs bg-background/50 rounded p-2 whitespace-pre-wrap text-foreground">
                    {tc.input}
                  </pre>
                </div>
                {/* Output */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-green-400 tracking-widest">OUTPUT</span>
                    <button
                      onClick={() => copyText(tc.expectedOutput, i * 2 + 1)}
                      className="p-0.5 text-muted-foreground hover:text-green-400 transition-colors"
                    >
                      {copiedIdx === i * 2 + 1 ? <CheckCircle size={11} className="text-green-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <pre className="font-mono text-xs bg-background/50 rounded p-2 whitespace-pre-wrap text-green-400">
                    {tc.expectedOutput}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
