import Link from "next/link";
import { Logo } from "@/components/Logo";
import { HomeScanBox } from "@/components/HomeScanBox";

export default function HomePage() {
  return (
    <div className="relative z-10 min-h-screen">
      <nav className="fixed top-0 left-0 right-0 z-100 bg-[rgba(10,12,16,0.95)] border-b border-(--color-border) flex items-center justify-between px-12 h-[60px] backdrop-blur-md">
        <Logo size="md" />
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 py-2 px-[18px] text-[13px] font-semibold rounded-lg border border-(--color-border2) text-(--color-text) hover:bg-(--color-surface2) transition-colors"
          >
            Se connecter
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 py-2 px-[18px] text-[13px] font-semibold rounded-lg bg-(--color-accent) text-white hover:bg-(--color-accent2) transition-colors"
          >
            Créer un compte
          </Link>
        </div>
      </nav>

      <div className="text-center pt-[140px] pb-12 px-12 max-w-[800px] mx-auto">
        <h1 className="text-5xl font-bold mb-3.5 leading-tight">
          Analysez la sécurité de
          <br />
          <span className="text-(--color-accent)">votre code en un clic</span>
        </h1>
        <p className="text-lg text-(--color-text2) mb-12 leading-relaxed">
          Détectez les vulnérabilités OWASP Top 10, les secrets exposés
          <br />
          et les dépendances compromises — gratuitement.
        </p>
      </div>

      <HomeScanBox />
    </div>
  );
}
