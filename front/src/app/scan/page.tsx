"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock, FolderOpen, CheckCircle, Check, ArrowRight, Circle, UploadCloud, X } from "lucide-react";
import JSZip from "jszip";
import { Sidebar } from "@/components/Sidebar";
import { createScan, uploadScanFile, isLoggedIn } from "@/lib/api";

// ─── Labels des étapes de progression ───────────────────────────────────────
const stepLabels = [
  "Clonage / extraction du projet",
  "Semgrep — Analyse statique",
  "ESLint Security — Linting JS",
  "npm audit — Dépendances",
  "TruffleHog — Secrets",
  "Mapping OWASP Top 10",
];

const steps = [
  { next: "Semgrep — Analyse statique..." },
  { next: "ESLint Security..." },
  { next: "npm audit..." },
  { next: "TruffleHog — Secrets..." },
  { next: "Mapping OWASP..." },
  { next: "Analyse terminée !" },
];

// ─── Helpers JSZip ───────────────────────────────────────────────────────────

/** Lit toutes les entrées d'un FileSystemDirectoryReader (max 100 par appel). */
async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) =>
      reader.readEntries(res, rej)
    );
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all;
}

/** Ajoute récursivement une entrée FileSystem dans un objet JSZip. */
async function addEntryToZip(zip: JSZip, entry: FileSystemEntry, basePath: string) {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej)
    );
    zip.file(`${basePath}${entry.name}`, file);
  } else if (entry.isDirectory) {
    const folder = zip.folder(`${basePath}${entry.name}/`)!;
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const children = await readAllEntries(reader);
    for (const child of children) {
      await addEntryToZip(folder as unknown as JSZip, child, "");
    }
  }
}

/** Compresse un FileSystemDirectoryEntry en File (zip). */
async function zipDirectoryEntry(entry: FileSystemDirectoryEntry): Promise<File> {
  const zip = new JSZip();
  const reader = entry.createReader();
  const children = await readAllEntries(reader);
  for (const child of children) {
    await addEntryToZip(zip, child, "");
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return new File([blob], `${entry.name}.zip`, { type: "application/zip" });
}

/** Compresse une liste de File (input webkitdirectory) en une archive zip. */
async function zipFileList(files: FileList): Promise<File> {
  const zip = new JSZip();
  const folderName = files[0]?.webkitRelativePath?.split("/")[0] || "upload";
  for (const file of Array.from(files)) {
    zip.file(file.webkitRelativePath || file.name, file);
  }
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return new File([blob], `${folderName}.zip`, { type: "application/zip" });
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter();

  // input de fichier unique (zip)
  const zipInputRef = useRef<HTMLInputElement>(null);
  // input de dossier (webkitdirectory)
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [repoInput, setRepoInput]     = useState("");
  const [uploadFile, setUploadFile]   = useState<File | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [isZipping, setIsZipping]     = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [currentStep, setCurrentStep]   = useState(0);
  const [progress, setProgress]         = useState(0);
  const [scanError, setScanError]       = useState("");

  useEffect(() => {
    if (!isLoggedIn()) router.push("/login");
  }, [router]);

  // ─── Drag-and-drop handlers ────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setScanError("");

    const item = e.dataTransfer.items?.[0];
    if (!item) return;

    const entry = item.webkitGetAsEntry?.();

    if (entry?.isDirectory) {
      // ── Cas 1 : dossier droppé ──────────────────────────────────────────
      setIsZipping(true);
      try {
        const file = await zipDirectoryEntry(entry as FileSystemDirectoryEntry);
        setUploadFile(file);
      } catch (err) {
        setScanError("Impossible de compresser le dossier.");
        console.error(err);
      } finally {
        setIsZipping(false);
      }
    } else if (entry?.isFile) {
      // ── Cas 2 : fichier droppé ──────────────────────────────────────────
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setScanError("Seuls les fichiers ZIP ou les dossiers sont acceptés.");
        return;
      }
      setUploadFile(file);
    }
  }, []);

  // ─── Sélection via input ───────────────────────────────────────────────────

  const handleZipSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setScanError("Seuls les fichiers ZIP sont acceptés.");
      return;
    }
    setUploadFile(file);
    setScanError("");
  }, []);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsZipping(true);
    setScanError("");
    try {
      const file = await zipFileList(files);
      setUploadFile(file);
    } catch (err) {
      setScanError("Impossible de compresser le dossier.");
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  }, []);

  // ─── Lancer le scan ────────────────────────────────────────────────────────

  const startScan = async () => {
    const url = repoInput.trim();
    if (!url && !uploadFile) {
      setScanError("Entrez une URL Git ou déposez un fichier ZIP / dossier.");
      return;
    }

    setScanError("");
    setShowProgress(true);
    setCurrentStep(0);
    setProgress(0);

    const pcts = [17, 34, 50, 67, 83, 100];
    let step = 0;
    const interval = setInterval(() => {
      if (step < steps.length) {
        setCurrentStep(step + 1);
        setProgress(pcts[step]);
        step++;
      } else {
        clearInterval(interval);
      }
    }, 900);

    try {
      const result = url
        ? await createScan(url)
        : await uploadScanFile(uploadFile!);

      clearInterval(interval);
      setCurrentStep(steps.length);
      setProgress(100);
      setTimeout(() => {
        router.push(`/dashboard?scanId=${result.scanId}`);
      }, 800);
    } catch (err: unknown) {
      clearInterval(interval);
      setShowProgress(false);
      setScanError(err instanceof Error ? err.message : "Erreur lors du scan");
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setScanError("");
    if (zipInputRef.current)    zipInputRef.current.value    = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative z-10">
      <Sidebar />
      <main className="ml-[220px] p-10 px-12">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold mb-1.5">Nouveau scan</h1>
          <p className="text-[15px] text-(--color-text2)">Analysez un dépôt Git ou uploadez votre code pour détecter les vulnérabilités</p>
        </div>

        {!showProgress && (
          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border2) rounded-2xl p-8 max-w-[820px] backdrop-blur">

            {/* ── URL Git ── */}
            <div className="text-[15px] font-semibold mb-1.5">🔗 URL du dépôt Git</div>
            <div className="text-[13px] text-(--color-text2) mb-4">Entrez l&apos;URL d&apos;un dépôt GitHub, GitLab ou Bitbucket public</div>
            <div className="flex gap-3 mb-2">
              <input
                type="text"
                className="flex-1 bg-(--color-bg) border border-(--color-border2) rounded-[10px] py-3.5 px-4 text-sm text-(--color-text) font-(--font-space-mono) outline-none focus:border-(--color-accent) placeholder:text-(--color-text3)"
                placeholder="https://github.com/organisation/mon-projet.git"
                value={repoInput}
                onChange={(e) => { setRepoInput(e.target.value); if (uploadFile) resetUpload(); }}
                onKeyDown={(e) => e.key === "Enter" && startScan()}
              />
              <button
                onClick={startScan}
                className="inline-flex items-center gap-2 py-2.5 px-7 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2) transition-colors"
              >
                <Zap size={18} strokeWidth={2} /> Lancer l&apos;analyse
              </button>
            </div>
            {scanError && <div className="text-xs text-(--color-red) mb-2">{scanError}</div>}
            <div className="text-xs text-(--color-text3) flex items-center gap-1.5 mb-5">
              <Lock size={14} strokeWidth={2} />Analyse sécurisée · Aucun code stocké
            </div>

            {/* ── Séparateur ── */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-px bg-(--color-border)" />
              <span className="text-xs text-(--color-text3)">ou uploadez vos fichiers</span>
              <div className="flex-1 h-px bg-(--color-border)" />
            </div>

            {/* ── Zone drag-and-drop ── */}
            {isZipping ? (
              <div className="border-2 border-dashed border-(--color-accent) bg-[rgba(59,130,246,0.06)] rounded-[10px] p-7 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-8 h-8 border-2 border-(--color-border2) border-t-(--color-accent) rounded-full animate-spin" />
                </div>
                <div className="text-sm text-(--color-text2)">Compression du dossier en cours…</div>
              </div>
            ) : uploadFile ? (
              /* ── Fichier prêt ── */
              <div className="border-2 border-(--color-green) bg-[rgba(34,197,94,0.05)] rounded-[10px] p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={28} className="text-(--color-green)" strokeWidth={2} />
                  <div>
                    <div className="text-sm font-semibold text-(--color-green)">{uploadFile.name}</div>
                    <div className="text-xs text-(--color-text3)">{(uploadFile.size / 1024 / 1024).toFixed(2)} Mo · Prêt à scanner</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={startScan}
                    className="inline-flex items-center gap-2 py-2 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2) transition-colors"
                  >
                    <Zap size={16} strokeWidth={2} /> Scanner
                  </button>
                  <button onClick={resetUpload} className="p-2 rounded-lg hover:bg-(--color-surface2) text-(--color-text3) hover:text-(--color-text) transition-colors">
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              /* ── Zone de drop vide ── */
              <div
                className={`border-2 border-dashed rounded-[10px] p-8 text-center cursor-pointer transition-colors select-none ${
                  isDragging
                    ? "border-(--color-accent) bg-[rgba(59,130,246,0.08)]"
                    : "border-(--color-border2) hover:border-(--color-accent) hover:bg-[rgba(59,130,246,0.04)]"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => zipInputRef.current?.click()}
              >
                {/* Inputs cachés */}
                <input ref={zipInputRef}    type="file" className="hidden" accept=".zip" onChange={handleZipSelect} />
                <input ref={folderInputRef} type="file" className="hidden"
                  // @ts-expect-error : webkitdirectory n'est pas dans les types standards
                  webkitdirectory=""
                  onChange={handleFolderSelect}
                />

                <div className="mb-3 flex justify-center">
                  <UploadCloud size={36} className={isDragging ? "text-(--color-accent)" : "text-(--color-text2)"} strokeWidth={1.5} />
                </div>
                <div className="text-sm text-(--color-text2) mb-1">
                  {isDragging
                    ? <span className="text-(--color-accent) font-semibold">Relâchez pour analyser</span>
                    : <>
                        Glissez un <strong className="text-(--color-text)">dossier</strong> ou un{" "}
                        <strong className="text-(--color-text)">.zip</strong> ici,
                        ou <span className="text-(--color-accent)">cliquez pour parcourir</span>
                      </>
                  }
                </div>
                <div className="text-xs text-(--color-text3)">ZIP · Dossier entier — Max 50 Mo</div>

                {/* Bouton dossier séparé */}
                <button
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-(--color-text3) hover:text-(--color-text) border border-(--color-border2) hover:border-(--color-border) rounded-lg px-3 py-1.5 transition-colors"
                >
                  <FolderOpen size={13} strokeWidth={2} /> Sélectionner un dossier
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Progression ── */}
        {showProgress && (
          <div className="bg-[rgba(17,19,24,0.92)] border border-(--color-border2) rounded-2xl p-8 max-w-[820px] backdrop-blur">
            <div className="text-base font-semibold mb-5 flex items-center gap-2.5">
              <div className="w-[18px] h-[18px] border-2 border-(--color-border2) border-t-(--color-accent) rounded-full animate-spin shrink-0" />
              <span>{currentStep < steps.length ? steps[currentStep]?.next : "Analyse terminée !"}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {stepLabels.map((label, i) => (
                <div key={i} className="flex items-center gap-3 text-[13px]">
                  <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] shrink-0 ${
                    i < currentStep  ? "bg-[rgba(34,197,94,0.2)] text-(--color-green)"
                    : i === currentStep ? "bg-[rgba(59,130,246,0.2)] text-(--color-accent)"
                    : "bg-(--color-surface2) text-(--color-text3)"
                  }`}>
                    {i < currentStep    ? <Check     size={14} strokeWidth={2.5} />
                    : i === currentStep ? <ArrowRight size={14} strokeWidth={2.5} />
                    :                    <Circle     size={6}  fill="currentColor" />}
                  </div>
                  <span className={i <= currentStep ? "text-(--color-text)" : "text-(--color-text2)"}>{label}</span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-(--color-border) rounded mt-5 overflow-hidden">
              <div className="h-full bg-(--color-accent) rounded transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
