"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Folder, FileText, Circle, Sparkles, Upload, Star, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";
import { getScan, getScans, isLoggedIn, toggleFavorite, deleteScan, setCurrentScanId } from "@/lib/api";

interface VulnData {
  id: number;
  tool: string;
  title: string;
  severity: string;
  owaspCategory: string;
  filePath: string;
  lineStart: number;
}

interface ScanData {
  id: number;
  repoUrl: string;
  repoName: string;
  language: string;
  status: string;
  score: number;
  vulnTotal: number;
  vulnCritical: number;
  vulnHigh: number;
  vulnMedium: number;
  vulnLow: number;
  secretsCount: number;
  filesTotal: number;
  filesImpacted: number;
  isFavorite: boolean;
  createdAt: string;
  vulnerabilities?: VulnData[];
}

interface ScanListItem {
  id: number;
  repoName: string;
  language: string;
  score: number;
  vulnTotal: number;
  vulnCritical: number;
  isFavorite: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scanId");

  const [scan, setScan] = useState<ScanData | null>(null);
  const [scanList, setScanList] = useState<ScanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    const load = async () => {
      try {
        const scans = await getScans();
        setScanList(scans || []);
        const id = scanId ? parseInt(scanId) : scans?.[0]?.id;
        if (id) { const data = await getScan(id); setScan(data); setCurrentScanId(id); }
      } catch (err) { console.error("Erreur chargement:", err); }
      finally { setLoading(false); }
    };
    load();
  }, [scanId, router]);

  const handleFavorite = async () => {
    if (!scan) return;
    try {
      await toggleFavorite(scan.id);
      setScan({ ...scan, isFavorite: !scan.isFavorite });
      setScanList(scanList.map(s => s.id === scan.id ? { ...s, isFavorite: !s.isFavorite } : s));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce scan ?")) return;
    try {
      await deleteScan(id);
      setScanList(scanList.filter(s => s.id !== id));
      if (scan?.id === id) setScan(null);
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (<div className="relative z-10"><Sidebar /><main className="ml-[220px] p-10 px-12"><div className="text-(--color-text2)">Chargement...</div></main></div>);
  }

  if (!scan) {
    return (<div className="relative z-10"><Sidebar /><main className="ml-[220px] p-10 px-12"><div className="text-(--color-text2)">Aucun scan trouvé. <Link href="/scan" className="text-(--color-accent) hover:underline">Lancer un scan</Link></div></main></div>);
  }

  const gradeColor = scan.score >= 80 ? "var(--color-green)" : scan.score >= 60 ? "var(--color-yellow)" : scan.score >= 40 ? "var(--color-orange)" : "var(--color-red)";
  const grade = scan.score >= 80 ? "A" : scan.score >= 60 ? "B" : scan.score >= 40 ? "C" : scan.score >= 20 ? "D" : "F";
  const dashOffset = 427 - (427 * scan.score / 100);
  const date = new Date(scan.createdAt).toLocaleString("fr-FR");

  const owaspMap: Record<string, { name: string; count: number }> = {};
  (scan.vulnerabilities || []).forEach((v) => {
    const cat = v.owaspCategory || "A10:2025";
    if (!owaspMap[cat]) owaspMap[cat] = { name: cat, count: 0 };
    owaspMap[cat].count++;
  });
  const owaspItems = Object.entries(owaspMap).map(([id, { count }]) => ({ id, count })).sort((a, b) => b.count - a.count);
  const maxOwasp = owaspItems[0]?.count || 1;

  // Filtrer les vulnérabilités
  const filteredVulns = (scan.vulnerabilities || []).filter(v => !severityFilter || v.severity === severityFilter);

  return (
    <div className="relative z-10">
      <Sidebar />
      <main className="ml-[220px] p-10 px-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-xs font-(--font-space-mono) text-(--color-text3) flex items-center gap-1.5">
              <Folder size={14} strokeWidth={2} />
              {scan.repoName || scan.repoUrl}
            </div>
            <h1 className="text-[28px] font-semibold mb-1.5">Dashboard de sécurité</h1>
            <p className="text-[15px] text-(--color-text2)">Analyse complète — {date}</p>
          </div>
          <div className="flex gap-2.5">
            <button onClick={handleFavorite} className={`inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border font-semibold text-sm transition-colors ${scan.isFavorite ? "border-(--color-yellow) text-(--color-yellow) bg-[rgba(234,179,8,0.1)]" : "border-(--color-border2) text-(--color-text) hover:bg-(--color-surface2)"}`}>
              <Star size={18} strokeWidth={2} fill={scan.isFavorite ? "currentColor" : "none"} />
              {scan.isFavorite ? "Favori" : "Ajouter aux favoris"}
            </button>
            <Link href={`/report?scanId=${scan.id}`} className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2)">
              <FileText size={18} strokeWidth={2} /> Rapport
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Score global" value={String(scan.score)} sub={`/100 — ${grade}`} pill={grade} pillIcon={<Circle size={10} fill="currentColor" />} valueColor={gradeColor} pillStyle="bg-[rgba(239,68,68,0.15)] text-(--color-red) inline-flex items-center gap-1" />
          <StatCard label="Vulnérabilités" value={String(scan.vulnTotal)} sub={`${scan.vulnCritical} critiques · ${scan.vulnHigh} hautes`} pill="Détectées" pillStyle="bg-[rgba(249,115,22,0.15)] text-(--color-orange)" />
          <StatCard label="Secrets détectés" value={String(scan.secretsCount)} sub="Clés API, tokens Git" pill={scan.secretsCount > 0 ? "Action requise" : "OK"} pillIcon={<Circle size={10} fill="currentColor" />} valueColor={scan.secretsCount > 0 ? "var(--color-red)" : "var(--color-green)"} pillStyle={scan.secretsCount > 0 ? "bg-[rgba(239,68,68,0.15)] text-(--color-red) inline-flex items-center gap-1" : "bg-[rgba(34,197,94,0.15)] text-(--color-green) inline-flex items-center gap-1"} />
          <StatCard label="Fichiers analysés" value={String(scan.filesTotal)} sub={`${scan.filesImpacted} fichiers impactés`} pill="Complet" pillIcon={<Sparkles size={10} strokeWidth={2} />} valueColor="var(--color-green)" pillStyle="bg-[rgba(34,197,94,0.15)] text-(--color-green) inline-flex items-center gap-1" />
        </div>

        <div className="grid grid-cols-[300px_1fr] gap-5 mb-5">
          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-7 flex flex-col items-center backdrop-blur">
            <div className="text-[11px] text-(--color-text2) uppercase tracking-widest mb-5">Score de sécurité</div>
            <div className="w-40 h-40 relative mb-5">
              <svg className="absolute top-0 left-0 -rotate-90" width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke="#1a1d25" strokeWidth="14" />
                <circle cx="80" cy="80" r="68" fill="none" stroke={gradeColor} strokeWidth="14" strokeDasharray="427" strokeDashoffset={dashOffset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold" style={{ color: gradeColor }}>{scan.score}</div>
                <div className="text-xs text-(--color-text3) mt-1">/ 100</div>
              </div>
            </div>
            <div className="w-full space-y-1.5 border-t border-(--color-border) pt-1.5">
              <ScoreLegItem color="var(--color-red)" label="Critique" val={String(scan.vulnCritical)} />
              <ScoreLegItem color="var(--color-orange)" label="Haute" val={String(scan.vulnHigh)} />
              <ScoreLegItem color="var(--color-yellow)" label="Moyenne" val={String(scan.vulnMedium)} />
              <ScoreLegItem color="var(--color-green)" label="Faible" val={String(scan.vulnLow)} />
            </div>
          </div>

          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-6 backdrop-blur">
            <div className="text-sm font-semibold mb-5">Mapping OWASP Top 10 — 2025</div>
            {owaspItems.length === 0 && <div className="text-sm text-(--color-text3)">Aucune vulnérabilité détectée.</div>}
            {owaspItems.map((item) => {
              const pct = Math.round((item.count / maxOwasp) * 100);
              const color = item.count >= 10 ? "var(--color-red)" : item.count >= 5 ? "var(--color-orange)" : "var(--color-yellow)";
              return (
                <div key={item.id} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div><span className="font-(--font-space-mono) text-[11px] text-(--color-accent)">{item.id}</span></div>
                    <div className="text-xs text-(--color-text3)">{item.count}</div>
                  </div>
                  <div className="h-1.5 bg-(--color-bg) rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${pct}%`, background: color }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden mb-6 backdrop-blur-sm">
          <div className="p-4 px-6 border-b border-(--color-border) flex items-center justify-between">
            <div className="text-sm font-semibold">Vulnérabilités détectées</div>
            <div className="flex gap-2">
              <button onClick={() => setSeverityFilter(null)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${!severityFilter ? "border-(--color-accent) bg-[rgba(59,130,246,0.12)] text-(--color-accent)" : "border-(--color-border2) bg-(--color-bg) text-(--color-text2)"}`}>Tous ({scan.vulnTotal})</button>
              {scan.vulnCritical > 0 && <button onClick={() => setSeverityFilter(severityFilter === "critical" ? null : "critical")} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${severityFilter === "critical" ? "border-(--color-red) bg-[rgba(239,68,68,0.12)] text-(--color-red)" : "border-(--color-border2) bg-(--color-bg) text-(--color-text2)"}`}><Circle size={8} fill="currentColor" className="text-(--color-red)" /> Critique ({scan.vulnCritical})</button>}
              {scan.vulnHigh > 0 && <button onClick={() => setSeverityFilter(severityFilter === "high" ? null : "high")} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${severityFilter === "high" ? "border-(--color-orange) bg-[rgba(249,115,22,0.12)] text-(--color-orange)" : "border-(--color-border2) bg-(--color-bg) text-(--color-text2)"}`}><Circle size={8} fill="currentColor" className="text-(--color-orange)" /> Haute ({scan.vulnHigh})</button>}
              {scan.vulnMedium > 0 && <button onClick={() => setSeverityFilter(severityFilter === "medium" ? null : "medium")} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${severityFilter === "medium" ? "border-(--color-yellow) bg-[rgba(234,179,8,0.12)] text-(--color-yellow)" : "border-(--color-border2) bg-(--color-bg) text-(--color-text2)"}`}><Circle size={8} fill="currentColor" className="text-(--color-yellow)" /> Moyenne ({scan.vulnMedium})</button>}
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead><tr className="bg-(--color-bg)">
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Sévérité</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Description</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Fichier</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">OWASP</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Outil</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Action</th>
            </tr></thead>
            <tbody>
              {filteredVulns.slice(0, 30).map((v) => (
                <tr key={v.id} className="border-t border-(--color-border) cursor-pointer hover:bg-(--color-surface2)" onClick={() => router.push(`/results?scanId=${scan.id}&vulnId=${v.id}`)}>
                  <td className="py-3.5 px-5 text-[13px]"><Badge severity={v.severity as "critical" | "high" | "medium" | "low"}>{v.severity.toUpperCase()}</Badge></td>
                  <td className="py-3.5 px-5 text-[13px]">{v.title}</td>
                  <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">{v.filePath}{v.lineStart ? `:${v.lineStart}` : ""}</span></td>
                  <td className="py-3.5 px-5"><Badge severity="owasp">{v.owaspCategory || "—"}</Badge></td>
                  <td className="py-3.5 px-5 text-xs text-(--color-text3)">{v.tool}</td>
                  <td className="py-3.5 px-5">
                    <Link href={`/results?scanId=${scan.id}&vulnId=${v.id}`} className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-(--color-accent) text-white" onClick={(e) => e.stopPropagation()}>
                      <Sparkles size={12} strokeWidth={2} /> Fix IA
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredVulns.length === 0 && (<tr><td colSpan={6} className="py-8 text-center text-(--color-text3)">Aucune vulnérabilité trouvée.</td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="text-base font-semibold mb-4">Scans récents</div>
        <div className="flex flex-col gap-2">
          {scanList.map((s) => {
            const sc = s.score >= 80 ? "var(--color-green)" : s.score >= 60 ? "var(--color-yellow)" : s.score >= 40 ? "var(--color-orange)" : "var(--color-red)";
            return (
              <div key={s.id} onClick={() => router.push(`/dashboard?scanId=${s.id}`)} className="bg-[rgba(17,19,24,0.9)] border border-(--color-border) rounded-lg py-4 px-5 flex items-center gap-4 cursor-pointer hover:border-(--color-border2) transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sc }} />
                <div className="flex-1">
                  <div className="text-[13px] font-(--font-space-mono)">{s.repoName}</div>
                  <div className="text-xs text-(--color-text3)">{new Date(s.createdAt).toLocaleDateString("fr-FR")} · {s.language || "—"}</div>
                </div>
                <div className="text-right mr-3">
                  <div className="font-(--font-space-mono) text-sm" style={{ color: sc }}>{s.score}/100</div>
                  <div className="text-[11px] text-(--color-text2)">{s.vulnTotal} vulns · {s.vulnCritical} critiques</div>
                </div>
                {s.isFavorite && <Star size={14} className="text-(--color-yellow) shrink-0" fill="currentColor" />}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="text-(--color-text3) hover:text-(--color-red) p-1 rounded transition-colors" title="Supprimer">
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            );
          })}
          {scanList.length === 0 && <div className="text-sm text-(--color-text3)">Aucun scan précédent.</div>}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, sub, pill, pillIcon, valueColor, pillStyle }: { label: string; value: string; sub: string; pill: string; pillIcon?: React.ReactNode; valueColor?: string; pillStyle: string }) {
  return (
    <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-5 px-6 backdrop-blur-sm">
      <div className="text-xs text-(--color-text2) uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-(--font-space-mono) leading-none" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      <div className="text-xs text-(--color-text3) mt-1.5">{sub}</div>
      <div className={`px-2 py-0.5 rounded text-[11px] font-semibold mt-2 ${pillStyle}`}>{pillIcon}{pill}</div>
    </div>
  );
}

function ScoreLegItem({ color, label, val }: { color: string; label: string; val: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-[13px] border-t border-(--color-border) first:border-t-0">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <div className="flex-1 text-(--color-text2)">{label}</div>
      <div className="font-bold" style={{ color }}>{val}</div>
    </div>
  );
}