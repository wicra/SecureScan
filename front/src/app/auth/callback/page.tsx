"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_URL = "http://localhost:3001/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    // Évite le double-appel en React StrictMode
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("token");
    const scanId = searchParams.get("scanId");

    if (!token) {
      router.replace("/login");
      return;
    }

    // 1. Stocker le token JWT
    localStorage.setItem("securescan_token", token);

    // 2. Récupérer le profil utilisateur
    const finish = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("securescan_user", JSON.stringify(data.user));
        }

        // 3. Claim le scan anonyme si un scanId est présent
        if (scanId) {
          await fetch(`${API_URL}/scans/${scanId}/claim`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          // Dans tous les cas, vider le scan anonyme du localStorage
          localStorage.removeItem("securescan_current_scan");
        } else {
          // Pas de scanId dans l'URL → vérifier quand même le localStorage
          const storedScan = localStorage.getItem("securescan_current_scan");
          if (storedScan) {
            await fetch(`${API_URL}/scans/${storedScan}/claim`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
            localStorage.removeItem("securescan_current_scan");
          }
        }
      } catch (err) {
        console.error("Erreur lors du callback GitHub :", err);
      } finally {
        router.replace("/dashboard");
      }
    };

    finish();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-(--color-text2)">
        <div className="w-8 h-8 border-2 border-(--color-border2) border-t-(--color-accent) rounded-full animate-spin" />
        <p className="text-sm">Connexion avec GitHub en cours…</p>
      </div>
    </div>
  );
}
