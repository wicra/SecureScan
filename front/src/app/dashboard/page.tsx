import Link from "next/link";
import { Folder, FileText, Circle, Sparkles, Wrench, Upload } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";

export default function DashboardPage() {
  return (
    <div className="relative z-10">
      <Sidebar />
      <main className="ml-[220px] p-10 px-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-xs font-(--font-space-mono) text-(--color-text3) flex items-center gap-1.5">
              <Folder size={14} strokeWidth={2} />
              github.com/juice-shop/juice-shop
            </div>
            <h1 className="text-[28px] font-semibold mb-1.5">Dashboard de sécurité</h1>
            <p className="text-[15px] text-(--color-text2)">Analyse complète — 02 mars 2026, 14h32</p>
          </div>
          <div className="flex gap-2.5">
            <Link
              href="/report"
              className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2)"
            >
              <FileText size={18} strokeWidth={2} />
              Rapport
            </Link>
            <button className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2)">
              <Upload size={18} strokeWidth={2} />
              Push fix
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-5">
          <StatCard label="Score global" value="23" sub="/100 — Critique" pill="CRITIQUE" pillIcon={<Circle size={10} fill="currentColor" className="text-(--color-red)" />} valueColor="var(--color-red)" pillStyle="bg-[rgba(239,68,68,0.15)] text-(--color-red) inline-flex items-center gap-1" />
          <StatCard label="Vulnérabilités" value="47" sub="3 critiques · 11 hautes" pill="+12 vs dernier scan" pillStyle="bg-[rgba(249,115,22,0.15)] text-(--color-orange)" />
          <StatCard label="Secrets détectés" value="5" sub="Clés API, tokens Git" pill="Action requise" pillIcon={<Circle size={10} fill="currentColor" className="text-(--color-red)" />} valueColor="var(--color-red)" pillStyle="bg-[rgba(239,68,68,0.15)] text-(--color-red) inline-flex items-center gap-1" />
          <StatCard label="Fichiers analysés" value="842" sub="127 fichiers impactés" pill="Complet" pillIcon={<Sparkles size={10} strokeWidth={2} className="text-(--color-green)" />} valueColor="var(--color-green)" pillStyle="bg-[rgba(34,197,94,0.15)] text-(--color-green) inline-flex items-center gap-1" />
        </div>

        <div className="grid grid-cols-[300px_1fr] gap-5 mb-5">
          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-7 flex flex-col items-center backdrop-blur">
            <div className="text-[11px] text-(--color-text2) uppercase tracking-widest mb-5">Score de sécurité</div>
            <div className="w-40 h-40 relative mb-5">
              <svg className="absolute top-0 left-0 -rotate-90" width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke="#1a1d25" strokeWidth="14" />
                <circle cx="80" cy="80" r="68" fill="none" stroke="#ef4444" strokeWidth="14" strokeDasharray="427" strokeDashoffset="328" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-(--color-red)">23</div>
                <div className="text-xs text-(--color-text3) mt-1">/ 100</div>
              </div>
            </div>
            <div className="w-full space-y-1.5 border-t border-(--color-border) pt-1.5">
              <ScoreLegItem color="var(--color-red)" label="Critique" val="3" />
              <ScoreLegItem color="var(--color-orange)" label="Haute" val="11" />
              <ScoreLegItem color="var(--color-yellow)" label="Moyenne" val="21" />
              <ScoreLegItem color="var(--color-green)" label="Faible" val="12" />
            </div>
          </div>

          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-6 backdrop-blur">
            <div className="text-sm font-semibold mb-5">Mapping OWASP Top 10 — 2025</div>
            {[
              { id: "A05:2025", name: "Injection (SQLi, XSS)", count: 14, pct: 85, color: "var(--color-red)" },
              { id: "A01:2025", name: "Broken Access Control", count: 9, pct: 60, color: "var(--color-orange)" },
              { id: "A03:2025", name: "Supply Chain Failures", count: 8, pct: 55, color: "var(--color-orange)" },
              { id: "A07:2025", name: "Authentication Failures", count: 6, pct: 40, color: "var(--color-yellow)" },
              { id: "A04:2025", name: "Cryptographic Failures", count: 5, pct: 33, color: "var(--color-yellow)" },
              { id: "A02:2025", name: "Security Misconfiguration", count: 5, pct: 33, color: "var(--color-yellow)" },
            ].map((item) => (
              <div key={item.id} className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div><span className="font-(--font-space-mono) text-[11px] text-(--color-accent)">{item.id}</span> <span className="text-[13px] font-medium">{item.name}</span></div>
                  <div className="text-xs text-(--color-text3)">{item.count}</div>
                </div>
                <div className="h-1.5 bg-(--color-bg) rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${item.pct}%`, background: item.color }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden mb-6 backdrop-blur-sm">
          <div className="p-4 px-6 border-b border-(--color-border) flex items-center justify-between">
            <div className="text-sm font-semibold">Vulnérabilités détectées</div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs border border-(--color-accent) bg-[rgba(59,130,246,0.12)] text-(--color-accent)">Tous (47)</span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-(--color-border2) bg-(--color-bg) text-(--color-text2) cursor-pointer"><Circle size={8} fill="currentColor" className="text-(--color-red)" /> Critique (3)</span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-(--color-border2) bg-(--color-bg) text-(--color-text2) cursor-pointer"><Circle size={8} fill="currentColor" className="text-(--color-orange)" /> Haute (11)</span>
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
              <tr className="border-t border-(--color-border) cursor-pointer hover:bg-(--color-surface2)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="critical">CRITIQUE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">SQL Injection via paramètre non échappé</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">routes/api.js:127</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A05:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">Semgrep</td>
                <td className="py-3.5 px-5"><Link href="/results" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-(--color-accent) text-white"><Sparkles size={12} strokeWidth={2} /> Fix IA</Link></td>
              </tr>
              <tr className="border-t border-(--color-border) cursor-pointer hover:bg-(--color-surface2)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="critical">CRITIQUE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">Clé API AWS exposée dans le code</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">config/aws.js:8</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A02:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">TruffleHog</td>
                <td className="py-3.5 px-5"><Link href="/results" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-(--color-accent) text-white"><Sparkles size={12} strokeWidth={2} /> Fix IA</Link></td>
              </tr>
              <tr className="border-t border-(--color-border) cursor-pointer hover:bg-(--color-surface2)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="high">HAUTE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">XSS — innerHTML non sanitisé</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">frontend/app.js:203</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A05:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">Semgrep</td>
                <td className="py-3.5 px-5"><Link href="/results" className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold bg-(--color-accent) text-white"><Sparkles size={12} strokeWidth={2} /> Fix IA</Link></td>
              </tr>
              <tr className="border-t border-(--color-border) cursor-pointer hover:bg-(--color-surface2)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="high">HAUTE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">lodash@4.17.4 — CVE-2021-23337</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">package.json</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A03:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">npm audit</td>
                <td className="py-3.5 px-5"><button className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-semibold border border-(--color-border2) text-(--color-text) hover:bg-(--color-surface2)"><Wrench size={12} strokeWidth={2} /> npm fix</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-base font-semibold mb-4">Scans récents</div>
        <div className="flex flex-col gap-2">
          <ScanItem repo="github.com/juice-shop/juice-shop" date="Il y a 2 heures · JavaScript" score="23/100" scoreColor="var(--color-red)" vulns="47 vulnérabilités · 3 critiques" dotColor="var(--color-red)" />
          <ScanItem repo="github.com/mon-org/api-backend" date="Hier · Node.js" score="61/100" scoreColor="var(--color-orange)" vulns="12 vulnérabilités · 1 critique" dotColor="var(--color-orange)" />
          <ScanItem repo="github.com/mon-org/frontend-react" date="02 mars · TypeScript" score="84/100" scoreColor="var(--color-green)" vulns="3 vulnérabilités · 0 critique" dotColor="var(--color-green)" />
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

function ScanItem({ repo, date, score, scoreColor, vulns, dotColor }: { repo: string; date: string; score: string; scoreColor: string; vulns: string; dotColor: string }) {
  return (
    <div className="bg-[rgba(17,19,24,0.9)] border border-(--color-border) rounded-lg py-4 px-5 flex items-center gap-4 cursor-pointer hover:border-(--color-border2) transition-colors">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
      <div className="flex-1">
        <div className="text-[13px] font-(--font-space-mono)">{repo}</div>
        <div className="text-xs text-(--color-text3)">{date}</div>
      </div>
      <div className="text-right">
        <div className="font-(--font-space-mono) text-sm" style={{ color: scoreColor }}>{score}</div>
        <div className="text-[11px] text-(--color-text2)">{vulns}</div>
      </div>
    </div>
  );
}
