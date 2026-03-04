"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/** Mappe l'extension du fichier vers le langage Prism */
function extToLang(filePath?: string | null): string {
  const ext = filePath?.split(".").at(-1)?.toLowerCase() ?? "js";
  const map: Record<string, string> = {
    js: "javascript",   jsx: "jsx",        ts: "typescript",  tsx: "tsx",
    py: "python",       java: "java",      rb: "ruby",        php: "php",
    go: "go",           rs: "rust",        cs: "csharp",      cpp: "cpp",
    c: "c",             sh: "bash",        bash: "bash",      yml: "yaml",
    yaml: "yaml",       json: "json",      html: "html",      css: "css",
    sql: "sql",         kt: "kotlin",      swift: "swift",    dart: "dart",
  };
  return map[ext] ?? "javascript";
}

interface CodeBlockProps {
  code: string;
  /** Chemin du fichier source — utilisé pour la détection du langage */
  filePath?: string | null;
  /** Forcer un langage précis (override filePath) */
  language?: string;
  showLineNumbers?: boolean;
  startingLineNumber?: number;
}

export function CodeBlock({
  code,
  filePath,
  language,
  showLineNumbers = true,
  startingLineNumber = 1,
}: CodeBlockProps) {
  const lang = language ?? extToLang(filePath);

  return (
    <SyntaxHighlighter
      language={lang}
      style={vscDarkPlus}
      showLineNumbers={showLineNumbers}
      startingLineNumber={startingLineNumber}
      wrapLines
      wrapLongLines
      customStyle={{
        margin: 0,
        padding: "1rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        lineHeight: "1.6",
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        fontFamily: "var(--font-space-mono, monospace)",
        overflowX: "auto",
      }}
      lineNumberStyle={{
        color: "var(--color-text3)",
        paddingRight: "1.25rem",
        userSelect: "none",
        minWidth: "2.5rem",
      }}
      // Surcharge minimale du thème pour coller avec notre palette
      codeTagProps={{ style: { fontFamily: "inherit" } }}
    >
      {code.trim()}
    </SyntaxHighlighter>
  );
}
