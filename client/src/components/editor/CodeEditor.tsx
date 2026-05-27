"use client";

import Editor from "@monaco-editor/react";
import { Language } from "@/types";

const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  java: "java", python: "python", cpp: "cpp",
  javascript: "javascript", c: "c",
};

interface Props {
  language: Language;
  value: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
  darkMode?: boolean;  // NEW — controlled by parent
}

export default function CodeEditor({
  language, value, onChange, readOnly = false, darkMode = true,
}: Props) {
  return (
    <Editor
      height="100%"
      language={MONACO_LANGUAGE_MAP[language]}
      value={value}
      onChange={onChange}
      theme={darkMode ? "vs-dark" : "light"}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        readOnly,
        tabSize: 4,
        wordWrap: "on",
        lineNumbers: "on",
        renderLineHighlight: "all",
        automaticLayout: true,
        padding: { top: 12 },
      }}
    />
  );
}
