"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, Download, FileText, Shield } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/Badge";
import { getScan, isLoggedIn, getCurrentScanId } from "@/lib/api";

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
        const id = paramScanId ? parseInt(paramScanId) : getCurrentScanId();
        if (id) {
          const data = await getScan(id);
          setScan(data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [paramScanId, router]);

  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

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

  const handleDownloadPDF = async () => {
    if (!scan) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ─── Couleurs RGB ─────────────────────────────────────────────────────
      type RGB = [number, number, number];
      const C: Record<string, RGB> = {
        bg:      [10,  12,  16],
        surface: [17,  19,  24],
        border:  [31,  35,  48],
        text:    [232, 234, 240],
        text2:   [139, 145, 168],
        text3:   [85,  92,  114],
        accent:  [59,  130, 246],
        green:   [34,  197, 94],
        red:     [239, 68,  68],
        orange:  [249, 115, 22],
        yellow:  [234, 179, 8],
        white:   [255, 255, 255],
      };

      const PW = 210, PH = 297, ML = 18, MR = 18;
      const UW = PW - ML - MR;
      const BMARGIN = 18;

      const grade      = scan.score >= 80 ? "A" : scan.score >= 60 ? "B" : scan.score >= 40 ? "C" : scan.score >= 20 ? "D" : "F";
      const gradeRgb   = (scan.score >= 80 ? C.green : scan.score >= 60 ? C.yellow : scan.score >= 40 ? C.orange : C.red) as RGB;
      const dateStr    = new Date(scan.createdAt).toLocaleDateString("fr-FR");
      const vulns      = scan.vulnerabilities || [];
      const total      = Math.max(scan.vulnTotal, 1);

      const tc  = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
      const fc  = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
      const dc  = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
      const txt = (s: string, x: number, yy: number) => pdf.text(s, x, yy);

      let y = 0;

      const fillPage = () => { fc(C.surface); pdf.rect(0, 0, PW, PH, "F"); };

      const newPage = () => {
        pdf.addPage();
        fillPage();
        y = 20;
      };

      const need = (h: number) => { if (y + h > PH - BMARGIN) newPage(); };

      // ─── PAGE 1 FOND ──────────────────────────────────────────────────────
      fillPage();
      y = 20;

      // ── HEADER ────────────────────────────────────────────────────────────
      // Logo box
      fc(C.accent); pdf.roundedRect(ML, y - 4, 8, 8, 1, 1, "F");
      tc(C.white); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
      txt("S", ML + 2.6, y + 2.2);

      // Titre gauche
      tc(C.text); pdf.setFontSize(13); txt("Secure", ML + 11, y + 2);
      tc(C.accent); txt("Scan", ML + 11 + pdf.getStringUnitWidth("Secure") * 13 * 0.352778, y + 2);
      tc(C.text3); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5);
      txt("Rapport de securite automatise", ML + 11, y + 7);

      // Titre droit
      tc(C.text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
      const h1 = "Analyse de securite";
      txt(h1, PW - MR - pdf.getStringUnitWidth(h1) * 12 * 0.352778, y + 2);
      tc(C.text2); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
      const h2 = `${scan.repoName}  •  ${dateStr}`;
      txt(h2, PW - MR - pdf.getStringUnitWidth(h2) * 9 * 0.352778, y + 7.5);
      tc(C.text3); pdf.setFontSize(6.5);
      const urlTrunc = scan.repoUrl.length > 55 ? scan.repoUrl.slice(0, 55) + "…" : scan.repoUrl;
      txt(urlTrunc, PW - MR - pdf.getStringUnitWidth(urlTrunc) * 6.5 * 0.352778, y + 12.5);

      y += 20;
      fc(C.border); pdf.rect(ML, y, UW, 0.4, "F");
      y += 6;

      // ── 3 STAT CARDS ──────────────────────────────────────────────────────
      const cW = (UW - 8) / 3, cH = 22;
      const statCard = (x: number, label: string, value: string, sub: string, vc: RGB) => {
        fc(C.bg); dc(C.border); pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, cW, cH, 2, 2, "FD");
        tc(C.text3); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
        txt(label.toUpperCase(), x + 4, y + 6);
        tc(vc); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
        txt(value, x + 4, y + 15);
        tc(C.text3); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
        txt(sub, x + 4, y + 20);
      };
      statCard(ML,                  "Score global",      `${scan.score}/100`,   `Grade : ${grade}`,                               gradeRgb);
      statCard(ML + cW + 4,         "Vulnerabilites",    `${scan.vulnTotal}`,   `${scan.vulnCritical} crit.  ${scan.vulnHigh} hts`, C.text);
      statCard(ML + (cW + 4) * 2,   "Fichiers analyses", `${scan.filesTotal}`,  `${scan.filesImpacted} impacte(s)`,               C.green);
      y += cH + 4;

      // ── 4 MINI CARTES SÉVÉRITÉ ────────────────────────────────────────────
      const sevCards: [string, number, RGB][] = [
        ["CRITIQUES", scan.vulnCritical, C.red],
        ["HAUTES",    scan.vulnHigh,     C.orange],
        ["MOYENNES",  scan.vulnMedium,   C.yellow],
        ["FAIBLES",   scan.vulnLow,      C.green],
      ];
      const scW = (UW - 12) / 4, scH = 16;
      sevCards.forEach(([label, count, rgb], i) => {
        const x = ML + i * (scW + 4);
        fc(C.bg); dc(C.border); pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, scW, scH, 1.5, 1.5, "FD");
        fc(rgb); pdf.roundedRect(x + 3, y + 4, 2, 8, 0.5, 0.5, "F");
        tc(C.text3); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
        txt(label, x + 8, y + 7);
        tc(rgb); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
        txt(String(count), x + 8, y + 13.5);
      });
      y += scH + 5;

      // ── DISTRIBUTION BAR ──────────────────────────────────────────────────
      if (vulns.length > 0) {
        tc(C.text3); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
        txt("DISTRIBUTION DES SEVERITES", ML, y + 3); y += 5;
        let bx = ML;
        ([
          [scan.vulnCritical, C.red], [scan.vulnHigh, C.orange],
          [scan.vulnMedium, C.yellow], [scan.vulnLow, C.green],
        ] as [number, RGB][]).forEach(([n, rgb]) => {
          if (n > 0) { const w = (n / total) * UW; fc(rgb); pdf.rect(bx, y, w, 3.5, "F"); bx += w; }
        });
        y += 3.5 + 3;
        let lx = ML;
        ([["Critiques", scan.vulnCritical, C.red], ["Hautes", scan.vulnHigh, C.orange],
          ["Moyennes", scan.vulnMedium, C.yellow], ["Faibles", scan.vulnLow, C.green]] as [string, number, RGB][])
          .filter(([, n]) => n > 0)
          .forEach(([label, n, rgb]) => {
            fc(rgb); pdf.circle(lx + 1.5, y + 1.5, 1.5, "F");
            tc(C.text3); pdf.setFontSize(7);
            txt(`${label} ${Math.round((n / total) * 100)}%`, lx + 5, y + 3);
            lx += 34;
          });
        y += 8;
      }

      // ── RÉSUMÉ EXÉCUTIF ───────────────────────────────────────────────────
      need(35);
      tc(C.text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
      txt("Resume executif", ML, y + 4); y += 6;
      fc(C.border); pdf.rect(ML, y, UW, 0.3, "F"); y += 5;

      const secLevel = grade === "A" || grade === "B" ? "satisfaisant" : grade === "C" ? "moyen" : "critique";
      const summary =
        `L'analyse du depot ${scan.repoName} revele un niveau de securite ${secLevel} ` +
        `avec un score de ${scan.score}/100 (grade ${grade}). ` +
        `Sur ${scan.filesTotal} fichiers analyses, ${scan.filesImpacted} contiennent au moins une vulnerabilite. ` +
        `${scan.vulnTotal} problemes : ${scan.vulnCritical} critiques, ${scan.vulnHigh} hautes, ` +
        `${scan.vulnMedium} moyennes, ${scan.vulnLow} faibles. ` +
        (scan.secretsCount > 0
          ? `ALERTE : ${scan.secretsCount} secret(s) expose(s) — rotation immediate requise.`
          : "Aucun secret expose detecte.");

      tc(C.text2); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
      pdf.splitTextToSize(summary, UW).forEach((line: string) => {
        need(5); txt(line, ML, y); y += 5;
      });
      y += 4;

      // ── ALERTE SECRETS ────────────────────────────────────────────────────
      if (scan.secretsCount > 0) {
        need(16);
        fc([50, 15, 15] as RGB); dc(C.red); pdf.setLineWidth(0.4);
        pdf.roundedRect(ML, y, UW, 14, 2, 2, "FD");
        tc(C.red); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
        txt(`! Secrets exposes detectes (${scan.secretsCount})`, ML + 4, y + 6);
        tc([220, 150, 150] as RGB); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
        txt("Cles API / tokens detectes — rotation immediate requise.", ML + 4, y + 11);
        y += 18;
      }

      // ── OWASP ─────────────────────────────────────────────────────────────
      const owaspMap: Record<string, number> = {};
      vulns.forEach(v => { const k = v.owaspCategory || "Autre"; owaspMap[k] = (owaspMap[k] || 0) + 1; });
      const owaspItems = Object.entries(owaspMap).sort((a, b) => b[1] - a[1]);

      if (owaspItems.length > 0) {
        need(20);
        tc(C.text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
        txt("Mapping OWASP Top 10 — 2025", ML, y + 4); y += 6;
        fc(C.border); pdf.rect(ML, y, UW, 0.3, "F"); y += 5;

        const maxO = owaspItems[0][1];
        owaspItems.forEach(([cat, count]) => {
          need(9);
          const rgb: RGB = count >= 10 ? C.red : count >= 5 ? C.orange : C.yellow;
          tc(C.text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
          const catTrunc = cat.length > 55 ? cat.slice(0, 55) + "…" : cat;
          txt(catTrunc, ML, y + 3.5);
          tc(C.text2); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8);
          txt(String(count), ML + UW - 62, y + 3.5);
          fc(C.border); pdf.rect(ML + UW - 57, y + 1, 38, 2.5, "F");
          fc(rgb); pdf.rect(ML + UW - 57, y + 1, (count / maxO) * 38, 2.5, "F");
          const bLabel = count >= 10 ? "CRITIQUE" : count >= 5 ? "HAUTE" : "MOYENNE";
          fc([Math.round(rgb[0] * 0.12), Math.round(rgb[1] * 0.12), Math.round(rgb[2] * 0.12)] as RGB);
          pdf.roundedRect(ML + UW - 17, y - 0.5, 17, 5, 1, 1, "F");
          tc(rgb); pdf.setFontSize(5); pdf.setFont("helvetica", "bold");
          txt(bLabel, ML + UW - 16, y + 3.3);
          fc(C.border); pdf.rect(ML, y + 5.5, UW, 0.2, "F");
          y += 7;
        });
        y += 3;
      }

      // ── LISTE DES VULNÉRABILITÉS ───────────────────────────────────────────
      if (vulns.length > 0) {
        need(20);
        tc(C.text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
        txt(`Toutes les vulnerabilites (${vulns.length})`, ML, y + 4); y += 6;
        fc(C.border); pdf.rect(ML, y, UW, 0.3, "F"); y += 5;

        const sRgb = (s: string): RGB =>
          ({ critical: C.red, high: C.orange, medium: C.yellow, low: C.green }[s] as RGB) ?? C.text3;
        const sTxt = (s: string) =>
          ({ critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" }[s] ?? s.toUpperCase());

        vulns.forEach(v => {
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
          const titleLines: string[] = pdf.splitTextToSize(v.title || "Sans titre", UW - 52);
          const rowH = Math.max(10, titleLines.length * 4.5 + 5);
          need(rowH + 1);

          const rgb = sRgb(v.severity);
          // Badge sévérité
          fc([Math.round(rgb[0]*0.15), Math.round(rgb[1]*0.15), Math.round(rgb[2]*0.15)] as RGB);
          pdf.roundedRect(ML, y, 18, 5, 1, 1, "F");
          tc(rgb); pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.5);
          txt(sTxt(v.severity), ML + 1.5, y + 3.5);

          // Titre
          tc(C.text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
          titleLines.forEach((line: string, li: number) => txt(line, ML + 21, y + 3.5 + li * 4.5));

          // Catégorie OWASP
          if (v.owaspCategory) {
            tc(C.text3); pdf.setFontSize(7);
            txt(v.owaspCategory, ML + 21, y + 3.5 + titleLines.length * 4.5);
          }

          // Chemin fichier (droite)
          if (v.filePath) {
            const fp = `${v.filePath}${v.lineStart ? `:${v.lineStart}` : ""}`;
            const fpTrunc = fp.length > 40 ? "…" + fp.slice(-40) : fp;
            tc(C.text3); pdf.setFontSize(6.5); pdf.setFont("courier", "normal");
            txt(fpTrunc, PW - MR - pdf.getStringUnitWidth(fpTrunc) * 6.5 * 0.352778, y + 3.5);
            pdf.setFont("helvetica", "normal");
          }

          fc(C.border); pdf.rect(ML, y + rowH, UW, 0.2, "F");
          y += rowH + 1;
        });
      }

      // ── FOOTER SUR CHAQUE PAGE ────────────────────────────────────────────
      const nbPages = (pdf as any).internal.getNumberOfPages();
      for (let p = 1; p <= nbPages; p++) {
        pdf.setPage(p);
        fc(C.border); pdf.rect(ML, PH - 13, UW, 0.3, "F");
        tc(C.text3); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
        txt("SecureScan — IPSSI Hackathon 2026", ML, PH - 8);
        const right = `Genere le ${dateStr}  •  Confidentiel  •  Scan #${scan.id}  •  Page ${p}/${nbPages}`;
        txt(right, PW - MR - pdf.getStringUnitWidth(right) * 6.5 * 0.352778, PH - 8);
      }

      pdf.save(`securescan-${scan.repoName || "report"}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Erreur lors de la generation du PDF.");
    } finally {
      setPdfLoading(false);
    }
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

  const vulns = scan.vulnerabilities || [];
  const criticalVulns = vulns.filter(v => v.severity === "critical");
  const highVulns    = vulns.filter(v => v.severity === "high");
  const mediumVulns  = vulns.filter(v => v.severity === "medium");
  const lowVulns     = vulns.filter(v => v.severity === "low");

  const owaspMap: Record<string, number> = {};
  vulns.forEach(v => {
    const cat = v.owaspCategory || "Autre";
    owaspMap[cat] = (owaspMap[cat] || 0) + 1;
  });
  const owaspItems = Object.entries(owaspMap).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
  const maxOwasp = owaspItems[0]?.count || 1;

  // Distribution sévérité en %
  const totalForBar = scan.vulnTotal || 1;
  const distCritical = Math.round((criticalVulns.length / totalForBar) * 100);
  const distHigh     = Math.round((highVulns.length   / totalForBar) * 100);
  const distMedium   = Math.round((mediumVulns.length / totalForBar) * 100);
  const distLow      = Math.round((lowVulns.length    / totalForBar) * 100);

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
            <button onClick={handleDownloadPDF} disabled={pdfLoading} className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2) disabled:opacity-60 disabled:cursor-wait">
              <Download size={18} strokeWidth={2} /> {pdfLoading ? "Génération…" : "Télécharger PDF"}
            </button>
          </div>
        </div>

        <div ref={reportRef} className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
          {/* Barre titre aperçu */}
          <div className="bg-(--color-bg) py-3 px-5 border-b border-(--color-border) flex items-center gap-3">
            <div className="text-xs text-(--color-text3) flex items-center gap-2"><FileText size={14} strokeWidth={2} />Aperçu du rapport</div>
          </div>

          <div className="p-12 px-14">
            {/* ── En-tête ── */}
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
                <div className="text-xs text-(--color-text3) mt-0.5 font-(--font-space-mono) break-all">{scan.repoUrl}</div>
              </div>
            </div>

            {/* ── Grille de métriques (6 cases) ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Score global</div>
                <div className="text-2xl font-bold font-(--font-space-mono)" style={{ color: gradeColor }}>{scan.score}<span className="text-base text-(--color-text3)">/100</span></div>
                <div className="text-xs text-(--color-text3) mt-0.5">Grade : <span style={{ color: gradeColor }} className="font-bold">{grade}</span></div>
              </div>
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Vulnérabilités</div>
                <div className="text-2xl font-bold font-(--font-space-mono)">{scan.vulnTotal}</div>
                <div className="text-xs text-(--color-text3) mt-0.5">dont {scan.vulnCritical} critiques · {scan.vulnHigh} hautes</div>
              </div>
              <div className="bg-(--color-bg) rounded-lg py-4 px-4 border border-(--color-border)">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-1.5">Fichiers</div>
                <div className="text-2xl font-bold font-(--font-space-mono)">{scan.filesTotal}</div>
                <div className="text-xs text-(--color-text3) mt-0.5">{scan.filesImpacted} impacté{scan.filesImpacted !== 1 ? "s" : ""}</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-9">
              {[
                { label: "Critiques", count: scan.vulnCritical, color: "var(--color-red)" },
                { label: "Hautes",    count: scan.vulnHigh,     color: "var(--color-orange)" },
                { label: "Moyennes",  count: scan.vulnMedium,   color: "var(--color-yellow)" },
                { label: "Faibles",   count: scan.vulnLow,      color: "var(--color-green)" },
              ].map(({ label, count, color }) => (
                <div key={label} className="bg-(--color-bg) rounded-lg py-3 px-4 border border-(--color-border) flex items-center gap-3">
                  <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div>
                    <div className="text-[11px] text-(--color-text3) uppercase tracking-wider">{label}</div>
                    <div className="text-xl font-bold font-(--font-space-mono)" style={{ color }}>{count}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Distribution visuelle ── */}
            {scan.vulnTotal > 0 && (
              <div className="mb-9">
                <div className="text-[11px] text-(--color-text3) uppercase tracking-wider mb-2">Distribution des sévérités</div>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {distCritical > 0 && <div style={{ width: `${distCritical}%`, background: "var(--color-red)" }} className="rounded-l-full" title={`Critiques ${distCritical}%`} />}
                  {distHigh     > 0 && <div style={{ width: `${distHigh}%`,     background: "var(--color-orange)" }} title={`Hautes ${distHigh}%`} />}
                  {distMedium   > 0 && <div style={{ width: `${distMedium}%`,   background: "var(--color-yellow)" }} title={`Moyennes ${distMedium}%`} />}
                  {distLow      > 0 && <div style={{ width: `${distLow}%`,      background: "var(--color-green)" }} className="rounded-r-full" title={`Faibles ${distLow}%`} />}
                </div>
                <div className="flex gap-5 mt-2">
                  {[
                    { label: "Critiques", pct: distCritical, color: "var(--color-red)" },
                    { label: "Hautes",    pct: distHigh,     color: "var(--color-orange)" },
                    { label: "Moyennes",  pct: distMedium,   color: "var(--color-yellow)" },
                    { label: "Faibles",   pct: distLow,      color: "var(--color-green)" },
                  ].filter(d => d.pct > 0).map(d => (
                    <div key={d.label} className="flex items-center gap-1.5 text-xs text-(--color-text3)">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.label} <span className="font-(--font-space-mono)">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Résumé exécutif ── */}
            <div className="mb-8">
              <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Résumé exécutif</h2>
              <p className="text-sm text-(--color-text2) leading-relaxed">
                L&apos;analyse automatisée du dépôt <strong className="text-(--color-text)">{scan.repoName}</strong> révèle un niveau de sécurité{" "}
                <strong style={{ color: gradeColor }}>{grade === "A" || grade === "B" ? "satisfaisant" : grade === "C" ? "moyen" : "critique"}</strong>{" "}
                avec un score de <strong style={{ color: gradeColor }}>{scan.score}/100 (grade {grade})</strong>.{" "}
                Sur <strong className="text-(--color-text)">{scan.filesTotal} fichiers</strong> analysés, <strong className="text-(--color-text)">{scan.filesImpacted}</strong> contiennent au moins une vulnérabilité.{" "}
                {scan.vulnTotal} problèmes de sécurité ont été identifiés : <span style={{ color: "var(--color-red)" }}>{scan.vulnCritical} critiques</span>,{" "}
                <span style={{ color: "var(--color-orange)" }}>{scan.vulnHigh} hautes</span>,{" "}
                <span style={{ color: "var(--color-yellow)" }}>{scan.vulnMedium} moyennes</span> et{" "}
                <span style={{ color: "var(--color-green)" }}>{scan.vulnLow} faibles</span>.{" "}
                {scan.secretsCount > 0
                  ? <strong style={{ color: "var(--color-red)" }}>{scan.secretsCount} secret{scan.secretsCount > 1 ? "s" : ""} exposé{scan.secretsCount > 1 ? "s" : ""} ont été détectés et nécessitent une action immédiate (rotation des clés).</strong>
                  : "Aucun secret exposé n'a été détecté."}
              </p>
            </div>

            {/* ── Secrets exposés ── */}
            {scan.secretsCount > 0 && (
              <div className="mb-8 p-4 rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.07)]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-(--color-red) animate-pulse" />
                  <span className="text-sm font-semibold text-(--color-red)">⚠ Secrets exposés détectés</span>
                </div>
                <p className="text-xs text-(--color-text2)">
                  {scan.secretsCount} secret{scan.secretsCount > 1 ? "s" : ""} (clés API, tokens, mots de passe…) ont été trouvés dans le code source. Effectuez une rotation immédiate et ne les commitez plus jamais en clair.
                </p>
              </div>
            )}

            {/* ── Mapping OWASP ── */}
            {owaspItems.length > 0 && (
              <div className="mb-8">
                <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border)">Mapping OWASP Top 10 — 2025</h2>
                <div className="space-y-2">
                  {owaspItems.map(item => {
                    const pct   = Math.round((item.count / maxOwasp) * 100);
                    const color = item.count >= 10 ? "var(--color-red)" : item.count >= 5 ? "var(--color-orange)" : "var(--color-yellow)";
                    const badge = item.count >= 10 ? "CRITIQUE" : item.count >= 5 ? "HAUTE" : "MOYENNE";
                    return <OwaspReportRow key={item.id} id={item.id} name={item.id} count={item.count} pct={pct} color={color} badge={badge} />;
                  })}
                </div>
              </div>
            )}

            {/* ── Vulnérabilités par sévérité ── */}
            {(["critical","high","medium","low"] as const).map(sev => {
              const list = vulns.filter(v => v.severity === sev);
              if (list.length === 0) return null;
              const sevColor: Record<string,string> = { critical: "var(--color-red)", high: "var(--color-orange)", medium: "var(--color-yellow)", low: "var(--color-green)" };
              const sevLabel: Record<string,string> = { critical: "Critiques", high: "Hautes", medium: "Moyennes", low: "Faibles" };
              return (
                <div key={sev} className="mb-8">
                  <h2 className="text-[17px] font-semibold mb-4 pb-2 border-b border-(--color-border) flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: sevColor[sev] }} />
                    Vulnérabilités {sevLabel[sev]}
                    <span className="ml-auto text-sm font-(--font-space-mono)" style={{ color: sevColor[sev] }}>{list.length}</span>
                  </h2>
                  <div className="space-y-0">
                    {list.map((v, i) => (
                      <div key={v.id} className={`flex items-start gap-3 py-2.5 text-[13px] ${i < list.length - 1 ? "border-b border-(--color-border)" : ""}`}>
                        <Badge severity={sev}>{sev.toUpperCase()}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{v.title}</div>
                          {v.owaspCategory && <div className="text-xs text-(--color-text3) mt-0.5">{v.owaspCategory}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-(--font-space-mono) text-xs text-(--color-text3) truncate max-w-[220px]">{v.filePath}{v.lineStart ? `:${v.lineStart}` : ""}</div>
                          <div className="text-xs text-(--color-text3) mt-0.5">{v.tool}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* ── Pied de page ── */}
            <div className="pt-5 border-t border-(--color-border) flex justify-between text-xs text-(--color-text3)">
              <span className="flex items-center gap-2"><Shield size={14} strokeWidth={2} />SecureScan — IPSSI Hackathon 2026</span>
              <span>Généré le {date} · Confidentiel · Scan #{scan.id}</span>
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