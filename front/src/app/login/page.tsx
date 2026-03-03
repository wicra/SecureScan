"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, XCircle, Github, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

const INPUT_BASE =
  "w-full bg-(--color-bg) border rounded-lg py-3 px-3.5 text-sm text-(--color-text) outline-none transition-colors placeholder:text-(--color-text3) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg) focus-visible:border-(--color-accent)";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("admin");
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const tryLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (user === "admin" && pass === "admin") {
      setError(false);
      router.push("/dashboard");
    } else {
      setError(true);
    }
  };

  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
      <div
        className="fixed w-[700px] h-[700px] rounded-full pointer-events-none z-0"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      <div className="relative z-2 w-full max-w-[460px]">
        <div className="bg-[rgba(17,19,24,0.96)] border border-(--color-border2) rounded-2xl p-8 sm:p-12 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <header className="mb-8">
            <div className="flex items-center gap-2.5 mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-semibold mb-1.5">Connexion</h1>
            <p className="text-sm text-(--color-text2)">
              Accédez à votre espace d&apos;analyse de sécurité
            </p>
          </header>

          <div
            className="flex items-center gap-2 bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] rounded-lg py-2.5 px-3.5 text-xs text-(--color-text2) font-(--font-space-mono) mb-6"
            role="status"
            aria-live="polite"
          >
            <Lightbulb size={14} strokeWidth={2} aria-hidden />
            Compte démo : <strong>admin</strong> / <strong>admin</strong>
          </div>

          <form onSubmit={tryLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-username" className="block text-xs font-medium text-(--color-text2) mb-1.5 uppercase tracking-wider">
                Identifiant
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                className={`${INPUT_BASE} ${error ? "border-(--color-red)" : "border-(--color-border2)"}`}
                placeholder="admin"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                aria-invalid={error}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-(--color-text2) mb-1.5 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`${INPUT_BASE} pr-11 ${error ? "border-(--color-red)" : "border-(--color-border2)"}`}
                  placeholder="admin"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  aria-invalid={error}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text3) hover:text-(--color-text) transition-colors p-1 rounded"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                id="login-error"
                className="flex items-center gap-1.5 text-xs text-(--color-red)"
                role="alert"
              >
                <XCircle size={14} strokeWidth={2} aria-hidden />
                Identifiant ou mot de passe incorrect
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-5 rounded-lg bg-(--color-accent) text-white font-semibold text-sm hover:bg-(--color-accent2) transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
            >
              Se connecter
              <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </button>
          </form>

          <div className="flex items-center gap-3 my-6" role="separator" aria-hidden>
            <div className="flex-1 h-px bg-(--color-border)" />
            <span className="text-xs text-(--color-text3)">ou</span>
            <div className="flex-1 h-px bg-(--color-border)" />
          </div>

          <button
            type="button"
            onClick={() => tryLogin()}
            className="w-full py-2.5 px-5 rounded-lg border border-(--color-border2) text-(--color-text) font-semibold text-sm hover:bg-(--color-surface2) transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)"
          >
            <Github size={18} strokeWidth={2} aria-hidden />
            Continuer avec GitHub
          </button>

          <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-8 pt-6 border-t border-(--color-border)">
            <Link
              href="/"
              className="text-[13px] text-(--color-accent) no-underline hover:underline focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg) rounded"
            >
              ← Retour à l&apos;accueil
            </Link>
            <span className="inline-flex items-center gap-1.5 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-full py-1 px-3 text-[11px] text-(--color-green) font-(--font-space-mono) w-fit">
              <Lock size={12} strokeWidth={2} aria-hidden />
              Connexion chiffrée TLS 1.3
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
