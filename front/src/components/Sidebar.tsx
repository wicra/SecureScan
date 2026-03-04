"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BarChart3, Search, FileText, Clock, Star, Power } from "lucide-react";
import { Logo } from "./Logo";
import { logout, getStoredUser, getScans, getCurrentScanId } from "@/lib/api";


const currentScanId = getCurrentScanId();

const navItems = [
  { href: "/scan", Icon: Home, label: "Nouveau scan" },
  { href: "/dashboard", Icon: BarChart3, label: "Dashboard" },
  { href: `/results${currentScanId ? `?scanId=${currentScanId}` : ""}`, Icon: Search, label: "Résultats" },
  { href: `/report${currentScanId ? `?scanId=${currentScanId}` : ""}`, Icon: FileText, label: "Rapports" },
];

interface MiniScan { id: number; repoName: string; score: number; isFavorite: boolean; }

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [recentScans, setRecentScans] = useState<MiniScan[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [showFavs, setShowFavs] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (u) setUser(u);
    getScans().then(scans => setRecentScans((scans || []).slice(0, 5))).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); router.push("/login"); };
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";
  const favScans = recentScans.filter(s => s.isFavorite);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[rgba(17,19,24,0.97)] border-r border-(--color-border) flex flex-col p-5 px-3 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2 p-2 mb-6"><Logo size="sm" /></div>
      <div className="text-[10px] text-(--color-text3) uppercase tracking-widest px-2 mb-1.5 mt-3">Principal</div>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 py-2.5 px-2.5 rounded-md font-medium text-[13px] transition-colors mb-0.5 ${isActive ? "bg-[rgba(59,130,246,0.12)] text-(--color-accent)" : "text-(--color-text2) hover:bg-(--color-surface2) hover:text-(--color-text)"}`}>
            <item.Icon size={18} strokeWidth={2} className="shrink-0" />{item.label}
          </Link>
        );
      })}

      <div className="text-[10px] text-(--color-text3) uppercase tracking-widest px-2 mb-1.5 mt-3">Historique</div>
      <button onClick={() => { setShowRecent(!showRecent); setShowFavs(false); }} className="flex items-center gap-2.5 py-2 px-2 rounded-md text-[13px] text-(--color-text2) hover:bg-(--color-surface2) cursor-pointer mb-0.5 w-full text-left">
        <Clock size={18} strokeWidth={2} className="shrink-0" /> Scans récents
      </button>
      {showRecent && recentScans.map(s => (
        <Link key={s.id} href={`/dashboard?scanId=${s.id}`} className="flex items-center gap-2 py-1.5 px-4 text-[11px] text-(--color-text3) hover:text-(--color-text) hover:bg-(--color-surface2) rounded truncate">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.score >= 60 ? "var(--color-green)" : "var(--color-red)" }} />
          <span className="truncate">{s.repoName}</span>
          <span className="ml-auto font-(--font-space-mono)">{s.score}</span>
        </Link>
      ))}

      <button onClick={() => { setShowFavs(!showFavs); setShowRecent(false); }} className="flex items-center gap-2.5 py-2 px-2 rounded-md text-[13px] text-(--color-text2) hover:bg-(--color-surface2) cursor-pointer mb-0.5 w-full text-left">
        <Star size={18} strokeWidth={2} className="shrink-0" /> Favoris
      </button>
      {showFavs && favScans.length === 0 && <div className="text-[11px] text-(--color-text3) px-4 py-1">Aucun favori</div>}
      {showFavs && favScans.map(s => (
        <Link key={s.id} href={`/dashboard?scanId=${s.id}`} className="flex items-center gap-2 py-1.5 px-4 text-[11px] text-(--color-text3) hover:text-(--color-text) hover:bg-(--color-surface2) rounded truncate">
          <Star size={10} className="text-(--color-yellow) shrink-0" fill="currentColor" />
          <span className="truncate">{s.repoName}</span>
        </Link>
      ))}

      <div className="mt-auto pt-4 border-t border-(--color-border)">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-(--color-surface2)">
          <div className="w-[30px] h-[30px] bg-linear-to-br from-(--color-accent) to-(--color-purple) rounded-full flex items-center justify-center text-xs font-bold">{initial}</div>
          <div className="flex-1"><div className="text-[13px] font-medium">{user?.name || "Utilisateur"}</div></div>
          <button onClick={handleLogout} className="text-[11px] text-(--color-text3) p-1.5 rounded-md hover:text-(--color-red) hover:bg-[rgba(239,68,68,0.08)]" title="Déconnexion"><Power size={16} strokeWidth={2} /></button>
        </div>
      </div>
    </aside>
  );
}