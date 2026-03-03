"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Zap, Lock, FolderOpen, CheckCircle, GitBranch, Check, ArrowRight, Circle, Folder, LockKeyhole, AlertTriangle, Key } from "lucide-react";
import { Badge } from "./Badge";

export function HomeScanBox() {
  const [showProgress, setShowProgress] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [fileLoaded, setFileLoaded] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepLabels, setStepLabels] = useState<string[]>([
    "Clonage du dépôt",
    "Semgrep — Analyse statique",
    "ESLint Security — Linting JS",
    "npm audit — Dépendances",
    "TruffleHog — Secrets",
    "Mapping OWASP Top 10",
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { done: "Dépôt cloné avec succès", next: "Semgrep — Analyse statique..." },
    { done: "Semgrep — 14 vulnérabilités", next: "ESLint Security..." },
    { done: "ESLint — 8 avertissements", next: "npm audit..." },
    { done: "npm audit — 3 CVE détectés", next: "TruffleHog — Secrets..." },
    { done: "TruffleHog — 5 secrets trouvés", next: "Mapping OWASP..." },
    { done: "Mapping OWASP complet", next: "Analyse terminée !" },
  ];
  const pcts = [17, 34, 50, 67, 83, 100];

  const startScan = () => {
    if (!repoInput.trim() && !fileLoaded) {
      return;
    }
    setShowProgress(true);
    setShowResults(false);
    setProgress(0);
    setCurrentStep(0);
    setStepLabels([
      "Clonage du dépôt",
      "Semgrep — Analyse statique",
      "ESLint Security — Linting JS",
      "npm audit — Dépendances",
      "TruffleHog — Secrets",
      "Mapping OWASP Top 10",
    ]);

    let cur = 0;
    const tick = () => {
      if (cur >= steps.length) {
        setShowProgress(false);
        setShowResults(true);
        return;
      }
      const step = steps[cur];
      if (step) {
        setStepLabels((prev) => {
          const next = [...prev];
          next[cur] = step.done;
          return next;
        });
        setProgress(pcts[cur] ?? 100);
      }
      setCurrentStep(cur + 1);
      cur++;
      if (cur < steps.length) {
        setTimeout(tick, 900);
      } else {
        setTimeout(() => {
          setShowProgress(false);
          setShowResults(true);
        }, 600);
      }
    };
    setTimeout(tick, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFileLoaded({ name: f.name, size: f.size });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) setFileLoaded({ name: files[0].name, size: files[0].size });
  };

  return (
    <div className="max-w-[900px] mx-auto px-12 pb-10">
      {!showProgress && (
        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border2) rounded-2xl p-8 max-w-[820px] mx-auto mb-10 backdrop-blur">
          <div className="text-[15px] font-semibold mb-1.5 flex items-center gap-2">
            <GitBranch size={18} strokeWidth={2} />
            URL du dépôt Git
          </div>
          <div className="text-[13px] text-(--color-text2) mb-4">
            Entrez l&apos;URL d&apos;un dépôt GitHub, GitLab ou Bitbucket public
          </div>
          <div className="flex gap-3 mb-2">
            <input
              type="text"
              className="flex-1 bg-(--color-bg) border border-(--color-border2) rounded-[10px] py-3.5 px-4 text-sm text-(--color-text) font-(--font-space-mono) outline-none focus:border-(--color-accent) placeholder:text-(--color-text3)"
              placeholder="https://github.com/organisation/mon-projet.git"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startScan()}
            />
            <button
              onClick={startScan}
              className="inline-flex items-center gap-2 py-2.5 px-7 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2) transition-colors"
            >
              <Zap size={18} strokeWidth={2} />
              Lancer l&apos;analyse
            </button>
          </div>
          <div className="text-xs text-(--color-text3) flex items-center gap-1.5 mb-5">
            <Lock size={14} strokeWidth={2} />
            Analyse sécurisée · Aucun code stocké · Résultats instantanés
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-(--color-border)" />
            <span className="text-xs text-(--color-text3)">ou uploadez vos fichiers</span>
            <div className="flex-1 h-px bg-(--color-border)" />
          </div>

          <div
            className={`border-2 border-dashed rounded-[10px] p-7 text-center cursor-pointer transition-colors ${fileLoaded
                ? "border-(--color-green) bg-[rgba(34,197,94,0.05)]"
                : "border-(--color-border2) hover:border-(--color-accent) hover:bg-[rgba(59,130,246,0.04)]"
              }`}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => { }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="mb-2 flex justify-center">
              {fileLoaded ? <CheckCircle size={32} className="text-(--color-green)" strokeWidth={2} /> : <FolderOpen size={32} className="text-(--color-text2)" strokeWidth={2} />}
            </div>
            <div className="text-sm text-(--color-text2)">
              {fileLoaded ? (
                <span className="text-(--color-green) font-semibold">{fileLoaded.name}</span>
              ) : (
                <>
                  Glissez votre dossier ici ou{" "}
                  <span className="text-(--color-accent)">parcourir</span>
                </>
              )}
            </div>
            <div className="text-xs text-(--color-text3) mt-1">
              {fileLoaded
                ? `${(fileLoaded.size / 1024 / 1024).toFixed(1)} Mo · Prêt pour l'analyse`
                : "ZIP, dossier — Max 50 Mo"}
            </div>
          </div>
        </div>
      )}

      {showProgress && (
        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border2) rounded-2xl p-8 max-w-[820px] mx-auto mb-10 backdrop-blur">
          <div className="text-base font-semibold mb-5 flex items-center gap-2.5">
            <div
              className="w-[18px] h-[18px] border-2 border-(--color-border2) border-t-(--color-accent) rounded-full animate-spin shrink-0"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
            <span>{currentStep < steps.length ? steps[currentStep]?.next : "Analyse terminée !"}</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px]">
                <div
                  className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] shrink-0 ${i < currentStep
                      ? "bg-[rgba(34,197,94,0.2)] text-(--color-green)"
                      : i === currentStep
                        ? "bg-[rgba(59,130,246,0.2)] text-(--color-accent)"
                        : "bg-(--color-surface2) text-(--color-text3)"
                    }`}
                >
                  {i < currentStep ? <Check size={14} strokeWidth={2.5} /> : i === currentStep ? <ArrowRight size={14} strokeWidth={2.5} /> : <Circle size={6} fill="currentColor" />}
                </div>
                <span className={`flex items-center gap-2 ${i <= currentStep ? "text-(--color-text)" : "text-(--color-text2)"}`}>
                  {i < currentStep && <Check size={14} strokeWidth={2.5} className="text-(--color-green) shrink-0" />}
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-(--color-border) rounded mt-5 overflow-hidden">
            <div
              className="h-full bg-(--color-accent) rounded transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {showResults && (
        <PublicResults
          scanTarget={repoInput || fileLoaded?.name || "Fichier uploadé"}
        />
      )}
    </div>
  );
}

function PublicResults({ scanTarget }: { scanTarget: string }) {
  const owaspItems = [
    { id: "A05:2025", name: "Injection (SQLi, XSS)", count: 14, pct: 85, color: "var(--color-red)" },
    { id: "A01:2025", name: "Broken Access Control", count: 9, pct: 60, color: "var(--color-orange)" },
    { id: "A03:2025", name: "Supply Chain Failures", count: 8, pct: 55, color: "var(--color-orange)" },
    { id: "A07:2025", name: "Authentication Failures", count: 6, pct: 40, color: "var(--color-yellow)" },
    { id: "A04:2025", name: "Cryptographic Failures", count: 5, pct: 33, color: "var(--color-yellow)" },
  ];
  return (
    <section className="max-w-[900px] mx-auto px-12 pb-[60px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-(--font-space-mono) text-(--color-text3) mb-1 flex items-center gap-1.5">
            <Folder size={14} strokeWidth={2} />
            {scanTarget}
          </div>
          <div className="text-[22px] font-bold">Résultats de l&apos;analyse</div>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2)"
        >
          <LockKeyhole size={18} strokeWidth={2} />
          Voir le rapport complet
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Score global" value="23" sub="/100 — Critique" pill="CRITIQUE" pillIcon={<Circle size={10} fill="currentColor" className="text-(--color-red)" />} valueColor="var(--color-red)" pillStyle="bg-[rgba(239,68,68,0.15)] text-(--color-red) inline-flex items-center gap-1" />
        <StatCard label="Vulnérabilités" value="47" sub="3 critiques · 11 hautes" pill="Action requise" pillIcon={<AlertTriangle size={10} strokeWidth={2} className="text-(--color-orange)" />} pillStyle="bg-[rgba(249,115,22,0.15)] text-(--color-orange) inline-flex items-center gap-1" />
        <StatCard label="Secrets détectés" value="5" sub="Clés API, tokens Git" pill="Exposés" pillIcon={<Key size={10} strokeWidth={2} className="text-(--color-red)" />} valueColor="var(--color-red)" pillStyle="bg-[rgba(239,68,68,0.15)] text-(--color-red) inline-flex items-center gap-1" />
        <StatCard label="Fichiers analysés" value="842" sub="127 fichiers impactés" pill="Complet" pillIcon={<Check size={10} strokeWidth={2.5} className="text-(--color-green)" />} valueColor="var(--color-green)" pillStyle="bg-[rgba(34,197,94,0.15)] text-(--color-green) inline-flex items-center gap-1" />
      </div>
      <div className="grid grid-cols-[280px_1fr] gap-5 mb-6">
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
            {["red", "orange", "yellow", "green"].map((c, i) => (
              <div key={c} className="flex items-center gap-2 py-1.5 text-[13px] border-t border-(--color-border) first:border-t-0">
                <div className="w-2 h-2 rounded-full" style={{ background: `var(--color-${c})` }} />
                <div className="flex-1 text-(--color-text2)">{["Critique", "Haute", "Moyenne", "Faible"][i]}</div>
                <div className="font-bold" style={{ color: `var(--color-${c})` }}>{[3, 11, 21, 12][i]}</div>
              </div>
            ))}
          </div>
        </div>
        <BlurSection title="Connectez-vous pour voir le détail" sub="Le mapping OWASP complet est réservé aux membres.">
          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-6 backdrop-blur">
            <div className="text-sm font-semibold mb-5">Mapping OWASP Top 10 — 2025</div>
            {owaspItems.map((item) => (
              <div key={item.id} className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div><span className="font-(--font-space-mono) text-[11px] text-(--color-accent)">{item.id}</span> <span className="text-[13px] font-medium">{item.name}</span></div>
                  <div className="text-xs text-(--color-text3)">{item.count}</div>
                </div>
                <div className="h-1.5 bg-(--color-bg) rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${item.pct}%`, background: item.color }} /></div>
              </div>
            ))}
          </div>
        </BlurSection>
      </div>
      <BlurSection title="47 vulnérabilités détectées" sub="Créez un compte pour voir toutes les vulnérabilités et les corrections." primaryLabel="Créer un compte gratuit" secondaryLabel="Se connecter">
        <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl overflow-hidden backdrop-blur">
          <div className="p-4 px-6 border-b border-(--color-border) flex items-center justify-between">
            <div className="text-sm font-semibold">Vulnérabilités détectées</div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 rounded-full text-xs border border-(--color-accent) bg-[rgba(59,130,246,0.12)] text-(--color-accent)">Tous (47)</span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-(--color-border2) bg-(--color-bg) text-(--color-text2) cursor-pointer"><Circle size={8} fill="currentColor" className="text-(--color-red)" /> Critique (3)</span>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead><tr className="bg-(--color-bg)">
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Sévérité</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Description</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Fichier</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">OWASP</th>
              <th className="py-2.5 px-5 text-left text-[11px] font-medium text-(--color-text3) uppercase">Outil</th>
            </tr></thead>
            <tbody>
              <tr className="border-t border-(--color-border)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="critical">CRITIQUE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">SQL Injection via paramètre non échappé</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">routes/api.js:127</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A05:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">Semgrep</td>
              </tr>
              <tr className="border-t border-(--color-border)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="critical">CRITIQUE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">Clé API AWS exposée dans le code</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">config/aws.js:8</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A02:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">TruffleHog</td>
              </tr>
              <tr className="border-t border-(--color-border)">
                <td className="py-3.5 px-5 text-[13px]"><Badge severity="high">HAUTE</Badge></td>
                <td className="py-3.5 px-5 text-[13px]">XSS — innerHTML non sanitisé</td>
                <td className="py-3.5 px-5"><span className="font-(--font-space-mono) text-xs text-(--color-text2)">frontend/app.js:203</span></td>
                <td className="py-3.5 px-5"><Badge severity="owasp">A05:2025</Badge></td>
                <td className="py-3.5 px-5 text-xs text-(--color-text3)">Semgrep</td>
              </tr>
            </tbody>
          </table>
        </div>
      </BlurSection>
    </section>
  );
}

function StatCard({ label, value, sub, pill, pillIcon, valueColor, pillStyle }: { label: string; value: string; sub: string; pill: string; pillIcon?: React.ReactNode; valueColor?: string; pillStyle: string }) {
  return (
    <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border) rounded-xl p-5 px-6 backdrop-blur">
      <div className="text-xs text-(--color-text2) uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-(--font-space-mono) leading-none" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      <div className="text-xs text-(--color-text3) mt-1.5">{sub}</div>
      <div className={`px-2 py-0.5 rounded text-[11px] font-semibold mt-2 ${pillStyle}`}>{pillIcon}{pill}</div>
    </div>
  );
}

function BlurSection({ children, title, sub, primaryLabel = "Se connecter", secondaryLabel = "Créer un compte" }: { children: React.ReactNode; title: string; sub: string; primaryLabel?: string; secondaryLabel?: string }) {
  return (
    <div className="relative mb-6">
      {children}
      <div className="absolute inset-0 z-10 bg-[rgba(10,12,16,0.65)] backdrop-blur-md rounded-xl flex flex-col items-center justify-center gap-3.5 cursor-pointer">
        <Lock size={40} strokeWidth={2} className="text-(--color-text2)" />
        <div className="text-lg font-semibold text-center">{title}</div>
        <div className="text-sm text-(--color-text2) text-center max-w-[280px] leading-relaxed">{sub}</div>
        <div className="flex gap-2.5">
          <Link href="/login" className="inline-flex items-center gap-2 py-2.5 px-[18px] rounded-lg bg-(--color-accent) text-white font-semibold text-[13px] hover:bg-(--color-accent2)">{primaryLabel}</Link>
          <Link href="/login" className="inline-flex items-center gap-2 py-2.5 px-[18px] rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-[13px] hover:bg-(--color-surface2)">{secondaryLabel}</Link>
        </div>
      </div>
    </div>
  );
}
