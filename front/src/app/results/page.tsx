"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Check, Copy, FileText, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";
import { getScan, isLoggedIn, markVulnFixed } from "@/lib/api";
interface VulnData {
  id: number;
  tool: string;
  title: string;
  description: string | null;
  severity: string;
  owaspCategory: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
  ruleId: string | null;
  codeSnippet: string | null;
  fixSuggestion: string | null;
  cvssScore: number | null;
  isFixed: boolean;
}

interface ScanData {
  id: number;
  repoUrl: string;
  repoName: string;
  vulnerabilities: VulnData[];
  vulnTotal: number;
}

const severityLabel: Record<string, string> = {
  critical: "CRITIQUE",
  high: "HAUTE",
  medium: "MOYENNE",
  low: "FAIBLE",
};

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramScanId = searchParams.get("scanId");
  const paramVulnId = searchParams.get("vulnId");

  const [scan, setScan] = useState<ScanData | null>(null);
  const [vulns, setVulns] = useState<VulnData[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        const id = paramScanId ? parseInt(paramScanId) : null;
        if (!id) {
          setLoading(false);
          return;
        }

        const data = await getScan(id);
        setScan(data);
        const v = data.vulnerabilities || [];
        setVulns(v);

        // Si un vulnId est passé en param, sélectionner cette vuln
        const targetVuln = paramVulnId ? parseInt(paramVulnId) : v[0]?.id;
        if (targetVuln) setSelected(targetVuln);
      } catch (err) {
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [paramScanId, paramVulnId, router]);

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
    [selected, vulns],
  );

  const selectedVuln = vulns.find((v) => v.id === selected);

  const handleCopy = useCallback(() => {
    if (!selectedVuln?.fixSuggestion) return;
    void navigator.clipboard.writeText(selectedVuln.fixSuggestion).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedVuln]);

  if (loading) {
    return (
      <div className="relative z-10">
        <Sidebar />
        <main className="ml-[220px] p-10 px-12">
          <div className="text-(--color-text2)">Chargement...</div>
        </main>
      </div>
    );
  }

  if (!scan || vulns.length === 0) {
    return (
      <div className="relative z-10">
        <Sidebar />
        <main className="ml-[220px] p-10 px-12">
          <div className="text-(--color-text2)">Aucune vulnérabilité à afficher.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      <Sidebar />
      <main className="ml-[220px] min-w-0 p-6 sm:p-10 sm:px-12">
        <header className="mb-6 sm:mb-8">
          <nav className="flex items-center gap-2 text-sm text-(--color-text3) mb-3" aria-label="Fil d'Ariane">
            <Link href={`/dashboard?scanId=${scan.id}`} className="hover:text-(--color-text2) transition-colors">
              Dashboard
            </Link>
            <ChevronRight size={14} strokeWidth={2} className="shrink-0" aria-hidden />
            <span className="text-(--color-text2)">Résultats détaillés</span>
          </nav>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-[24px] sm:text-[28px] font-semibold mb-1.5">Résultats détaillés</h1>
              <p className="text-[14px] sm:text-[15px] text-(--color-text2)">
                {scan.vulnTotal} vulnérabilités · {scan.repoName || scan.repoUrl}
              </p>
            </div>
            <Link
              href="/report"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2) transition-colors w-fit"
            >
              <FileText size={18} strokeWidth={2} aria-hidden />
              Voir le rapport complet
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          {/* Liste des vulnérabilités */}
          <aside className="lg:min-w-0" aria-label="Liste des vulnérabilités">
            <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
              <div className="p-4 px-5 border-b border-(--color-border) text-[13px] font-semibold">
                {vulns.length} vulnérabilités
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
                    className={`p-3.5 px-5 border-b border-(--color-border) cursor-pointer transition-colors hover:bg-(--color-surface2) focus:outline-none ${
                      selected === v.id ? "bg-[rgba(59,130,246,0.08)] border-l-2 border-l-(--color-accent)" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge severity={v.severity as "critical" | "high" | "medium" | "low"}>{severityLabel[v.severity] || v.severity.toUpperCase()}</Badge>
                      <span className="text-[13px] font-medium flex-1 truncate">{v.title}</span>
                    </div>
                    <div className="text-[11px] font-(--font-space-mono) text-(--color-text3) truncate">{v.filePath}{v.lineStart ? ` · ligne ${v.lineStart}` : ""}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge severity="owasp">{v.owaspCategory || "—"}</Badge>
                      <span className="text-[11px] text-(--color-text3)">{v.tool}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Détail de la vulnérabilité sélectionnée */}
          <section className="min-w-0" aria-labelledby="vuln-detail-title">
            {selectedVuln ? (
              <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
                <div className="p-5 px-6 border-b border-(--color-border)">
                  <h2 id="vuln-detail-title" className="text-base font-semibold mb-2">{selectedVuln.title}</h2>
                  <div className="flex gap-3 flex-wrap">
                    <Badge severity={selectedVuln.severity as "critical" | "high" | "medium" | "low"}>{severityLabel[selectedVuln.severity] || selectedVuln.severity.toUpperCase()}</Badge>
                    <Badge severity="owasp">{selectedVuln.owaspCategory || "—"}</Badge>
                    <span className="text-xs text-(--color-text3) font-(--font-space-mono)">{selectedVuln.tool}</span>
                  </div>
                </div>
                <div className="p-6">
                  {/* Description */}
                  {selectedVuln.description && (
                    <div className="mb-6">
                      <div className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5">Description</div>
                      <div className="text-sm text-(--color-text2) leading-relaxed">{selectedVuln.description}</div>
                    </div>
                  )}

                  {/* Code vulnérable */}
                  {selectedVuln.codeSnippet && (
                    <div className="mb-6">
                      <div className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5">
                        Code vulnérable — {selectedVuln.filePath}{selectedVuln.lineStart ? `:${selectedVuln.lineStart}` : ""}
                      </div>
                      <div className="bg-(--color-bg) border border-(--color-border) rounded-lg p-4 font-(--font-space-mono) text-xs leading-relaxed overflow-x-auto">
                        <pre className="text-(--color-red) whitespace-pre-wrap">{selectedVuln.codeSnippet}</pre>
                      </div>
                    </div>
                  )}

                  {/* Correction suggérée */}
                  {selectedVuln.fixSuggestion && (
                    <div className="mb-6">
                      <div className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5 flex items-center gap-2">
                        <Sparkles size={14} strokeWidth={2} />
                        Correction suggérée
                      </div>
                      <div className="bg-(--color-bg) border border-(--color-border) rounded-lg p-4 font-(--font-space-mono) text-xs leading-relaxed overflow-x-auto">
                        <pre className="text-(--color-green) whitespace-pre-wrap">{selectedVuln.fixSuggestion}</pre>
                      </div>
                      <div className="flex flex-wrap gap-2.5 mt-4">
                        <button
                        type="button"
                        onClick={async () => {
                          if (!scan || !selectedVuln) return;
                          try {
                            await markVulnFixed(scan.id, selectedVuln.id);
                            setVulns(vulns.map(v => v.id === selectedVuln.id ? { ...v, isFixed: true } : v));
                          } catch (err) { console.error(err); }
                        }}
                        disabled={selectedVuln.isFixed}
                        className={`inline-flex items-center gap-2 py-2.5 px-5 rounded-lg font-semibold text-sm transition-opacity ${selectedVuln.isFixed ? "bg-(--color-surface2) text-(--color-text3) cursor-default" : "bg-(--color-green) text-black hover:opacity-90"}`}
                      >
                        <Check size={18} strokeWidth={2} />
                        {selectedVuln.isFixed ? "Corrigé ✓" : "Appliquer"}
                      </button>
                      </div>
                    </div>
                  )}

                  {/* Informations */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-(--color-text3) mb-2.5">Informations</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoItem label="Fichier" value={selectedVuln.filePath || "—"} mono />
                      <InfoItem label="Ligne" value={selectedVuln.lineStart ? String(selectedVuln.lineStart) : "—"} mono />
                      <InfoItem label="OWASP 2025" value={selectedVuln.owaspCategory || "—"} valueColor="var(--color-purple)" />
                      <InfoItem label="CVSS Score" value={selectedVuln.cvssScore ? `${selectedVuln.cvssScore} / 10` : "—"} valueColor="var(--color-red)" />
                      <InfoItem label="Règle" value={selectedVuln.ruleId || "—"} mono />
                      <InfoItem label="Statut" value={selectedVuln.isFixed ? "Corrigé ✓" : "Non corrigé"} valueColor={selectedVuln.isFixed ? "var(--color-green)" : "var(--color-orange)"} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-10 text-center text-(--color-text3)">
                Sélectionnez une vulnérabilité dans la liste.
              </div>
            )}
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