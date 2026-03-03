"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Search, FileText, Clock, Star, Power } from "lucide-react";
import { Logo } from "./Logo";

const navItems = [
  { href: "/", Icon: Home, label: "Nouveau scan" },
  { href: "/dashboard", Icon: BarChart3, label: "Dashboard" },
  { href: "/results", Icon: Search, label: "Résultats" },
  { href: "/report", Icon: FileText, label: "Rapports" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[rgba(17,19,24,0.97)] border-r border-(--color-border) flex flex-col p-5 px-3 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2 p-2 mb-6">
        <Logo size="sm" />
      </div>
      <div className="text-[10px] text-(--color-text3) uppercase tracking-widest px-2 mb-1.5 mt-3">
        Principal
      </div>
      {navItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 py-2.5 px-2.5 rounded-md font-medium text-[13px] transition-colors mb-0.5 ${isActive
                ? "bg-[rgba(59,130,246,0.12)] text-(--color-accent)"
                : "text-(--color-text2) hover:bg-(--color-surface2) hover:text-(--color-text)"
              }`}
          >
            <item.Icon size={18} strokeWidth={2} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <div className="text-[10px] text-(--color-text3) uppercase tracking-widest px-2 mb-1.5 mt-3">
        Historique
      </div>
      <div className="flex items-center gap-2.5 py-2 px-2 rounded-md text-[13px] text-(--color-text2) hover:bg-(--color-surface2) cursor-pointer mb-0.5">
        <Clock size={18} strokeWidth={2} className="shrink-0" />
        Scans récents
      </div>
      <div className="flex items-center gap-2.5 py-2 px-2 rounded-md text-[13px] text-(--color-text2) hover:bg-(--color-surface2) cursor-pointer mb-0.5">
        <Star size={18} strokeWidth={2} className="shrink-0" />
        Favoris
      </div>
      <div className="mt-auto pt-4 border-t border-(--color-border)">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-(--color-surface2) cursor-pointer">
          <div className="w-[30px] h-[30px] bg-linear-to-br from-(--color-accent) to-(--color-purple) rounded-full flex items-center justify-center text-xs font-bold">
            A
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium">Admin</div>
          </div>
          <Link
            href="/login"
            className="text-[11px] text-(--color-text3) p-1.5 rounded-md hover:text-(--color-red) hover:bg-[rgba(239,68,68,0.08)]"
            title="Déconnexion"
          >
            <Power size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
