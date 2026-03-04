"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, Download, FileText, Shield } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";
import { getScan, isLoggedIn } from "@/lib/api";

interface ScanData {
  id: number;
  repoUrl: string;
  repoName: string;
  score: number;
  vulnTotal: number;
  vulnCritical: number;
  vulnHigh: number;
  vulnMedium: number;
  vulnLow: number;
  secretsCount: number;
  filesTotal: number;
  filesImpacted: number;
  createdAt: string;
  vulnerabilities?: { id: number; severity: string; title: string; owaspCategory: string; tool: string; filePath: string; lineStart: number }[];
}

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramScanId = searchParams.get("scanId");
  const [scan, setScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    const load = async () => {
      try {
        if (paramScanId) {
          const data = await getScan(parseInt(paramScanId));
          setScan(data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [paramScanId, router]);

  const handleDownloadHTML = () => {
    if (!scan) return;
    const html = generateReportHTML(scan);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `securescan-${scan.repoName || "report"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (<div className="relative z-10"><Sidebar /><main className="ml-[220px] p-10 px-12"><div className="text-(--color-text2)">Chargement...</div></main></div>);
  }

  if (!scan) {
    return (<div className="relative z-10"><Sidebar /><main className="ml-[220px] p-10 px-12"><div className="text-(--color-text2)">Aucun scan sélectionné.</div></main></div>);
  }

  const grade = scan.score >= 80 ? "A" : scan.score >= 60 ? "B" : scan.score >= 40 ? "C" : scan.score >= 20 ? "D" : "F";
  const gradeColor = scan.score >= 80 ? "var(--color-green)" : scan.score >= 60 ? "var(--color-yellow)" : scan.score >= 40 ? "var(--color-orange)" : "var(--color-red)";
  const date = new Date(scan.createdAt).toLocaleDateString("fr-FR");

  const owaspMap: Record<string, number> = {};
  (scan.vulnerabilities || []).forEach(v => {
    const cat = v.owaspCategory || "Autre";
    owaspMap[cat] = (owaspMap[cat] || 0) + 1;
  });
  const owaspItems = Object.entries(owaspMap).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
  const maxOwasp = owaspItems[0]?.count || 1;

  return (
    <div className="relative z-10">
      <Sidebar />
      <main className="ml-[220px] p-10 px-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-semibold mb-1.5">Rapport de sécurité</h1>
            <p className="text-[15px] text-(--color-text2)">Prévisualisation · Prêt à exporter</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={handleDownloadHTML} className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2)">
              <Globe size={18} strokeWidth={2} /> HTML
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2)">
              <Download size={18} strokeWidth={2} /> Télécharger PDF
            </button>
          </div>
        </div>

        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
          <div className="bg-(--color-bg) py-3 px-5 border-b border-(--color-border) flex items-center gap-3">
            <div className="text-xs text-(--color-text3) flex items-center gap-2"><FileText size={14} strokeWidth={2} />Aperçu du rapport</div>
          </div>
          <div className="p-12 px-14">
            <div className="flex items-center justify-between mb-10 pb-6 border-b-2 border-(--color-border2)">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 bg-(--color-accent) rounded-lg flex items-center justify-center text-white"><Shield size={20} strokeWidth={2.5} /></div>
                  <span className="font-(--font-space-mono) text-xl">Secure<span className="text-(--color-accent)">Scan</span></span>
                </div>
                <div className="text-xs text-(--color-text3) font-(--font-space-mono)">Rapport de sécurité automatisé</div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold mb-1">Analyse de sécurité</div>
                <div className="text-sm text-(--color-text2)">{scan.repoName} · {date}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5 mb-9">
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Score global</div>
                <div className="text-lg font-(--font-space-mono)" style={{ color: gradeColor }}>{scan.score} / 100 ({grade})</div>
              </div>
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Vulnérabilités</div>
                <div className="text-lg font-(--font-space-mono)">{scan.vulnTotal} trouvées</div>
              </div>
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Fichiers analysés</div>
                <div className="text-lg font-(--font-space-mono) text-(--color-green)">{scan.filesTotal}</div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Résumé exécutif</h2>
              <p className="text-sm text-(--color-text2) leading-relaxed">
                L&apos;analyse révèle un niveau de sécurité <strong style={{ color: gradeColor }}>{grade === "A" || grade === "B" ? "satisfaisant" : grade === "C" ? "moyen" : "critique"}</strong> avec un score de {scan.score}/100. {scan.vulnTotal} vulnérabilités ont été identifiées, dont {scan.vulnCritical} de niveau critique et {scan.vulnHigh} de niveau haut. {scan.secretsCount > 0 ? `${scan.secretsCount} secrets exposés ont été détectés et nécessitent une action immédiate.` : "Aucun secret exposé n'a été détecté."}
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Mapping OWASP Top 10 — 2025</h2>
              <div className="space-y-3">
                {owaspItems.map(item => {
                  const pct = Math.round((item.count / maxOwasp) * 100);
                  const color = item.count >= 10 ? "var(--color-red)" : item.count >= 5 ? "var(--color-orange)" : "var(--color-yellow)";
                  const badge = item.count >= 10 ? "CRITIQUE" : item.count >= 5 ? "HAUTE" : "MOYENNE";
                  return <OwaspReportRow key={item.id} id={item.id} name={item.id} count={item.count} pct={pct} color={color} badge={badge} />;
                })}
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Vulnérabilités critiques</h2>
              <div className="space-y-2">
                {(scan.vulnerabilities || []).filter(v => v.severity === "critical" || v.severity === "high").slice(0, 10).map(v => (
                  <div key={v.id} className="flex items-center gap-3 py-2 border-b border-(--color-border) text-[13px]">
                    <Badge severity={v.severity as "critical" | "high"}>{v.severity.toUpperCase()}</Badge>
                    <span className="flex-1">{v.title}</span>
                    <span className="font-(--font-space-mono) text-xs text-(--color-text3)">{v.filePath}{v.lineStart ? `:${v.lineStart}` : ""}</span>
                    <span className="text-xs text-(--color-text3)">{v.tool}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 border-t border-(--color-border) flex justify-between text-xs text-(--color-text3)">
              <span className="flex items-center gap-2"><Shield size={14} strokeWidth={2} />SecureScan — IPSSI Hackathon 2026</span>
              <span>Généré le {date} · Confidentiel</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function OwaspReportRow({ id, name, count, pct, color, badge }: { id: string; name: string; count: number; pct: number; color: string; badge: string }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-(--color-border) text-[13px]">
      <div className="flex-1"><span className="text-(--color-accent) font-(--font-space-mono) text-xs">{id}</span> {name}</div>
      <div className="font-(--font-space-mono) w-[30px]">{count}</div>
      <div className="flex-[0_0_120px] h-1.5 bg-(--color-border) rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${pct}%`, background: color }} /></div>
      <Badge severity={badge === "CRITIQUE" ? "critical" : badge === "HAUTE" ? "high" : "medium"}>{badge}</Badge>
    </div>
  );
}

function generateReportHTML(scan: ScanData): string {
  const date = new Date(scan.createdAt).toLocaleDateString("fr-FR");
  const vulnRows = (scan.vulnerabilities || []).map(v =>
    `<tr><td>${v.severity.toUpperCase()}</td><td>${v.title}</td><td>${v.filePath || "—"}${v.lineStart ? `:${v.lineStart}` : ""}</td><td>${v.owaspCategory || "—"}</td><td>${v.tool}</td></tr>`
  ).join("");
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>SecureScan - ${scan.repoName}</title><style>body{font-family:system-ui;background:#0a0c10;color:#e2e8f0;padding:40px;max-width:900px;margin:0 auto}h1{color:#3b82f6}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px 12px;border:1px solid #1e293b;text-align:left;font-size:13px}th{background:#111318;color:#94a3b8}.critical{color:#ef4444}.high{color:#f97316}.medium{color:#eab308}.low{color:#22c55e}.score{font-size:48px;font-weight:bold}</style></head><body><h1>SecureScan — Rapport de sécurité</h1><p>${scan.repoName} · ${date}</p><div class="score" style="color:${scan.score >= 60 ? '#22c55e' : '#ef4444'}">${scan.score}/100</div><p>${scan.vulnTotal} vulnérabilités · ${scan.vulnCritical} critiques · ${scan.vulnHigh} hautes</p><p>${scan.filesTotal} fichiers analysés · ${scan.filesImpacted} impactés</p><h2>Vulnérabilités</h2><table><thead><tr><th>Sévérité</th><th>Description</th><th>Fichier</th><th>OWASP</th><th>Outil</th></tr></thead><tbody>${vulnRows}</tbody></table><hr><p style="font-size:11px;color:#64748b">SecureScan — IPSSI Hackathon 2026 · Généré le ${date}</p></body></html>`;
}