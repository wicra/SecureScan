import Link from "next/link";
import { Globe, Download, FileText, Shield } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";

export default function ReportPage() {
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
            <button className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2)">
              <Globe size={18} strokeWidth={2} />
              HTML
            </button>
            <button className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2)">
              <Download size={18} strokeWidth={2} />
              Télécharger PDF
            </button>
          </div>
        </div>

        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
          <div className="bg-(--color-bg) py-3 px-5 border-b border-(--color-border) flex items-center gap-3">
            <div className="text-xs text-(--color-text3) flex items-center gap-2">
              <FileText size={14} strokeWidth={2} />
              Aperçu du rapport
            </div>
            <div className="flex gap-2 ml-auto">
              <span className="px-3 py-1.5 rounded-full text-xs border border-(--color-accent) bg-[rgba(59,130,246,0.12)] text-(--color-accent)">Français</span>
              <span className="px-3 py-1.5 rounded-full text-xs border border-(--color-border2) bg-(--color-bg) text-(--color-text2) cursor-pointer">English</span>
            </div>
          </div>
          <div className="p-12 px-14">
            <div className="flex items-center justify-between mb-10 pb-6 border-b-2 border-(--color-border2)">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 bg-(--color-accent) rounded-lg flex items-center justify-center text-white">
                    <Shield size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-(--font-space-mono) text-xl">Secure<span className="text-(--color-accent)">Scan</span></span>
                </div>
                <div className="text-xs text-(--color-text3) font-(--font-space-mono)">Rapport de sécurité automatisé</div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold mb-1">Analyse de sécurité</div>
                <div className="text-sm text-(--color-text2)">juice-shop/juice-shop · 02 mars 2026</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5 mb-9">
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Score global</div>
                <div className="text-lg font-(--font-space-mono) text-(--color-red)">23 / 100</div>
              </div>
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Vulnérabilités</div>
                <div className="text-lg font-(--font-space-mono)">47 trouvées</div>
              </div>
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Fichiers analysés</div>
                <div className="text-lg font-(--font-space-mono) text-(--color-green)">842</div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Résumé exécutif</h2>
              <p className="text-sm text-(--color-text2) leading-relaxed">
                L&apos;analyse révèle un niveau de sécurité <strong className="text-(--color-red)">critique</strong> avec un score de 23/100. 47 vulnérabilités ont été identifiées, dont 3 de niveau critique. Les risques principaux sont l&apos;injection (A05) et le contrôle d&apos;accès (A01).
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Mapping OWASP Top 10 — 2025</h2>
              <div className="space-y-3">
                <OwaspReportRow id="A05:2025" name="Injection" count={14} pct={85} color="var(--color-red)" badge="CRITIQUE" />
                <OwaspReportRow id="A01:2025" name="Access Control" count={9} pct={60} color="var(--color-orange)" badge="HAUTE" />
                <OwaspReportRow id="A03:2025" name="Supply Chain" count={8} pct={55} color="var(--color-orange)" badge="HAUTE" />
              </div>
            </div>

            <div className="pt-5 border-t border-(--color-border) flex justify-between text-xs text-(--color-text3)">
              <span className="flex items-center gap-2">
                <Shield size={14} strokeWidth={2} />
                SecureScan — IPSSI Hackathon 2026
              </span>
              <span>Généré le 02 mars 2026 · Confidentiel</span>
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
      <div className="flex-1">
        <span className="text-(--color-accent) font-(--font-space-mono) text-xs">{id}</span> {name}
      </div>
      <div className="font-(--font-space-mono) w-[30px]">{count}</div>
      <div className="flex-[0_0_120px] h-1.5 bg-(--color-border) rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
      <Badge severity={badge === "CRITIQUE" ? "critical" : "high"}>{badge}</Badge>
    </div>
  );
}
