"use client";

import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Language } from "@/types";

const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  java: "java", python: "python", cpp: "cpp", javascript: "javascript", c: "c",
};

interface Props {
  language: Language;
  value: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ language, value, onChange, readOnly = false }: Props) {
  const { resolvedTheme } = useTheme();
  return (
    <Editor
      height="100%"
      language={MONACO_LANGUAGE_MAP[language]}
      value={value}
      onChange={onChange}
      theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
      options={{
        fontSize: 14, minimap: { enabled: false },
        scrollBeyondLastLine: false, readOnly,
        tabSize: 4, wordWrap: "on", lineNumbers: "on",
        renderLineHighlight: "all", automaticLayout: true,
      }}
    />
  );
}
