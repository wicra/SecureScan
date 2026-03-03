"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Sparkles, Check, Copy, FileText, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";

const vulns = [
  { id: 1, severity: "critical" as const, title: "SQL Injection", file: "routes/api.js · ligne 127", owasp: "A05:2025", tool: "Semgrep" },
  { id: 2, severity: "critical" as const, title: "Clé API exposée", file: "config/aws.js · ligne 8", owasp: "A02:2025", tool: "TruffleHog" },
  { id: 3, severity: "critical" as const, title: "eval() dangereux", file: "lib/utils.js · ligne 45", owasp: "A05:2025", tool: "ESLint" },
  { id: 4, severity: "high" as const, title: "XSS innerHTML", file: "frontend/app.js · ligne 203", owasp: "A05:2025", tool: "Semgrep" },
  { id: 5, severity: "high" as const, title: "lodash CVE-2021-23337", file: "package.json", owasp: "A03:2025", tool: "npm audit" },
  { id: 6, severity: "medium" as const, title: "CSRF manquant", file: "routes/auth.js · ligne 67", owasp: "A01:2025", tool: "Semgrep" },
];

const severityLabel: Record<string, string> = {
  critical: "CRITIQUE",
  high: "HAUTE",
  medium: "MOYENNE",
};

export default function ResultsPage() {
  const [selected, setSelected] = useState(1);
  const [copied, setCopied] = useState(false);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelected(id);
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = vulns.findIndex((v) => v.id === selected);
        const nextIdx = e.key === "ArrowDown" ? Math.min(idx + 1, vulns.length - 1) : Math.max(idx - 1, 0);
        const nextId = vulns[nextIdx]?.id ?? selected;
        setSelected(nextId);
        itemRefs.current[nextIdx]?.focus();
      }
    },
    [selected],
  );

  const handleCopy = useCallback(() => {
    const fixCode = `const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [req.query.id]);`;
    void navigator.clipboard.writeText(fixCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="relative z-10">
      <Sidebar />
      <main className="ml-[220px] min-w-0 p-6 sm:p-10 sm:px-12">
        <header className="mb-6 sm:mb-8">
          <nav className="flex items-center gap-2 text-sm text-(--color-text3) mb-3" aria-label="Fil d'Ariane">
            <Link href="/dashboard" className="hover:text-(--color-text2) transition-colors">
              Dashboard
            </Link>
            <ChevronRight size={14} strokeWidth={2} className="shrink-0" aria-hidden />
            <span className="text-(--color-text2)">Résultats détaillés</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-semibold mb-1.5">Résultats détaillés</h1>
              <p className="text-[14px] sm:text-[15px] text-(--color-text2)">
                47 vulnérabilités · github.com/juice-shop/juice-shop
              </p>
            </div>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2) transition-colors w-fit focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
            >
              <FileText size={18} strokeWidth={2} aria-hidden />
              Voir le rapport complet
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <aside
            className="lg:min-w-0"
            aria-label="Liste des vulnérabilités"
          >
            <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
              <div className="p-4 px-5 border-b border-(--color-border) text-[13px] font-semibold">
                47 vulnérabilités
              </div>
              <div role="listbox" aria-label="Sélectionner une vulnérabilité" className="max-h-[420px] overflow-y-auto">
                {vulns.map((v, idx) => (
                  <div
                    key={v.id}
                    ref={(el) => { itemRefs.current[idx] = el; }}
                    role="option"
                    tabIndex={selected === v.id ? 0 : -1}
                    aria-selected={selected === v.id}
                    onClick={() => setSelected(v.id)}
                    onKeyDown={(e) => handleKeyDown(e, v.id)}
                    className={`p-3.5 px-5 border-b border-(--color-border) cursor-pointer transition-colors hover:bg-(--color-surface2) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-inset ${
                      selected === v.id ? "bg-[rgba(59,130,246,0.08)] border-l-2 border-l-(--color-accent)" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge severity={v.severity}>{severityLabel[v.severity]}</Badge>
                      <span className="text-[13px] font-medium flex-1 truncate">{v.title}</span>
                    </div>
                    <div className="text-[11px] font-(--font-space-mono) text-(--color-text3) truncate">{v.file}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge severity="owasp">{v.owasp}</Badge>
                      <span className="text-[11px] text-(--color-text3)">{v.tool}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section
            className="min-w-0"
            aria-labelledby="vuln-detail-title"
          >
            <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
            <div className="p-5 px-6 border-b border-(--color-border)">
              <h2 id="vuln-detail-title" className="text-base font-semibold mb-2">SQL Injection via paramètre non échappé</h2>
              <div className="flex gap-3 flex-wrap">
                <Badge severity="critical">CRITIQUE</Badge>
                <Badge severity="owasp">A05:2025</Badge>
                <span className="text-xs text-(--color-text3) font-(--font-space-mono)">Semgrep</span>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5">Description</div>
                <div className="text-sm text-(--color-text2) leading-relaxed">
                  L&apos;entrée utilisateur est directement concaténée dans une requête SQL sans prepared statements. Un attaquant peut manipuler la requête pour accéder à des données non autorisées.
                </div>
              </div>
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5">Code vulnérable — routes/api.js:127</div>
                <div className="bg-(--color-bg) border border-(--color-border) rounded-lg p-4 font-(--font-space-mono) text-xs leading-relaxed overflow-x-auto">
                  <div className="text-(--color-text2)">app.get(&apos;/users&apos;, async (req, res) =&gt; &#123;</div>
                  <div className="text-(--color-red) bg-[rgba(239,68,68,0.08)] -mx-4 px-4">-  const query = `SELECT * FROM users WHERE id = ${"${req.query.id}"}`;</div>
                  <div className="text-(--color-text2)">  const result = await db.query(query);</div>
                  <div className="text-(--color-text2)">&#125;);</div>
                </div>
              </div>
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5 flex items-center gap-2">
                  <Sparkles size={14} strokeWidth={2} />
                  Correction suggérée par IA
                </div>
                <div className="bg-(--color-bg) border border-(--color-border) rounded-lg p-4 font-(--font-space-mono) text-xs leading-relaxed overflow-x-auto">
                  <div className="text-(--color-text2)">app.get(&apos;/users&apos;, async (req, res) =&gt; &#123;</div>
                  <div className="text-(--color-green) bg-[rgba(34,197,94,0.08)] -mx-4 px-4">+  const query = &apos;SELECT * FROM users WHERE id = ?&apos;;</div>
                  <div className="text-(--color-green) bg-[rgba(34,197,94,0.08)] -mx-4 px-4">+  const result = await db.query(query, [req.query.id]);</div>
                  <div className="text-(--color-text2)">&#125;);</div>
                </div>
                <div className="flex flex-wrap gap-2.5 mt-4">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-(--color-green) text-black font-semibold text-sm hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-(--color-green) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
                  >
                    <Check size={18} strokeWidth={2} aria-hidden />
                    Appliquer
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2) transition-colors focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
                  >
                    <Copy size={18} strokeWidth={2} aria-hidden />
                    {copied ? "Copié !" : "Copier"}
                  </button>
                  <Link
                    href="/report"
                    className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2) transition-colors focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
                  >
                    <FileText size={18} strokeWidth={2} aria-hidden />
                    Rapport
                  </Link>
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5">Informations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoItem label="Fichier" value="routes/api.js" mono />
                  <InfoItem label="Ligne" value="127" mono />
                  <InfoItem label="OWASP 2025" value="A05 — Injection" valueColor="var(--color-purple)" />
                  <InfoItem label="CVSS Score" value="9.8 / 10" valueColor="var(--color-red)" />
                </div>
              </div>
            </div>
          </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function InfoItem({ label, value, mono, valueColor }: { label: string; value: string; mono?: boolean; valueColor?: string }) {
  return (
    <div className="bg-(--color-bg) rounded-lg py-3 px-3.5 border border-(--color-border)">
      <div className="text-[11px] text-(--color-text3) mb-1">{label}</div>
      <div className={`text-[13px] font-medium ${mono ? "font-(--font-space-mono) text-xs" : ""}`} style={valueColor ? { color: valueColor } : undefined}>{value}</div>
    </div>
  );
}
