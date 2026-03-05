"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XCircle, Github, Lock, Eye, EyeOff, ArrowRight, UserPlus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { login, register, getCurrentScanId } from "@/lib/api";

const INPUT_BASE =
  "w-full bg-(--color-bg) border rounded-lg py-3 px-3.5 text-sm text-(--color-text) outline-none transition-colors placeholder:text-(--color-text3) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg) focus-visible:border-(--color-accent)";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!name.trim()) { setError("Le nom est requis."); setLoading(false); return; }
        await register(name, email, pass);
      } else {
        await login(email, pass);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
      <div className="fixed w-[700px] h-[700px] rounded-full pointer-events-none z-0" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div className="relative z-2 w-full max-w-[460px]">
        <div className="bg-[rgba(17,19,24,0.96)] border border-(--color-border2) rounded-2xl p-8 sm:p-12 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <header className="mb-8">
            <div className="flex items-center gap-2.5 mb-6"><Logo size="lg" /></div>
            <h1 className="text-2xl font-semibold mb-1.5">{isRegister ? "Créer un compte" : "Connexion"}</h1>
            <p className="text-sm text-(--color-text2)">{isRegister ? "Inscrivez-vous pour accéder au détail des analyses" : "Accédez à votre espace d'analyse de sécurité"}</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-(--color-text2) mb-1.5 uppercase tracking-wider">Nom</label>
                <input type="text" autoComplete="name" className={`${INPUT_BASE} ${error ? "border-(--color-red)" : "border-(--color-border2)"}`} placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-(--color-text2) mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" autoComplete="email" className={`${INPUT_BASE} ${error ? "border-(--color-red)" : "border-(--color-border2)"}`} placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-(--color-text2) mb-1.5 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} className={`${INPUT_BASE} pr-11 ${error ? "border-(--color-red)" : "border-(--color-border2)"}`} placeholder={isRegister ? "6 caractères minimum" : "••••••"} value={pass} onChange={(e) => setPass(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text3) hover:text-(--color-text) p-1 rounded">
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
            </div>
            {error && (<div className="flex items-center gap-1.5 text-xs text-(--color-red)"><XCircle size={14} strokeWidth={2} />{error}</div>)}
            <button type="submit" disabled={loading} className="w-full py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2) flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? (isRegister ? "Inscription..." : "Connexion...") : isRegister ? (<><UserPlus size={16} strokeWidth={2} /> Créer mon compte</>) : (<>Se connecter <ArrowRight size={16} strokeWidth={2} /></>)}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6"><div className="flex-1 h-px bg-(--color-border)" /><span className="text-xs text-(--color-text3)">ou</span><div className="flex-1 h-px bg-(--color-border)" /></div>
          <button type="button" onClick={() => {
            const scanId = getCurrentScanId();
            const url = `http://localhost:3001/api/auth/github${scanId ? `?scanId=${scanId}` : ""}`;
            window.location.href = url;
          }} className="w-full py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2) flex items-center justify-center gap-2">
            <Github size={18} strokeWidth={2} /> Continuer avec GitHub
          </button>

          <div className="text-center mt-6 text-[13px] text-(--color-text3)">
            {isRegister ? (<>Déjà un compte ?{" "}<button onClick={() => { setIsRegister(false); setError(""); }} className="text-(--color-accent) hover:underline">Se connecter</button></>) : (<>Pas encore de compte ?{" "}<button onClick={() => { setIsRegister(true); setError(""); }} className="text-(--color-accent) hover:underline">Créer un compte</button></>)}
          </div>

          <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-6 border-t border-(--color-border)">
            <Link href="/" className="text-[13px] text-(--color-accent) hover:underline">← Retour à l&apos;accueil</Link>
            <span className="inline-flex items-center gap-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full py-1 px-3 text-[11px] text-(--color-green) font-(--font-space-mono) w-fit"><Lock size={12} strokeWidth={2} />Connexion chiffrée TLS 1.3</span>
          </footer>
        </div>
      </div>
    </div>
  );
}