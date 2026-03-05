const API_URL = "http://localhost:3001/api";

// Récupère le token stocké dans localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("securescan_token");
}

// Headers avec ou sans auth
function headers(withAuth = false): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = getToken();
    if (token) h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

// === AUTH ===

// Réclame le scan anonyme (s'il existe) et l'attache à l'utilisateur connecté
async function claimAnonymousScan(scanId: number): Promise<void> {
  await fetch(`${API_URL}/scans/${scanId}/claim`, {
    method: "PATCH",
    headers: headers(true),
  });
  // Supprimer du localStorage dans tous les cas : même en cas d'erreur, ce scan
  // ne doit plus être proposé à un autre compte
  localStorage.removeItem("securescan_current_scan");
}

export async function login(email: string, password: string) {
  // Récupérer l'ID du scan anonyme AVANT de stocker le token
  const rawId = localStorage.getItem("securescan_current_scan");
  const anonymousScanId = rawId ? parseInt(rawId) : null;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de connexion");

  localStorage.setItem("securescan_token", data.token);
  localStorage.setItem("securescan_user", JSON.stringify(data.user));

  // Rattacher le scan anonyme à ce compte, puis le retirer du localStorage
  if (anonymousScanId) await claimAnonymousScan(anonymousScanId);

  return data;
}

export async function register(name: string, email: string, password: string) {
  // Récupérer l'ID du scan anonyme AVANT de stocker le token
  const rawId = localStorage.getItem("securescan_current_scan");
  const anonymousScanId = rawId ? parseInt(rawId) : null;

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur d'inscription");

  localStorage.setItem("securescan_token", data.token);
  localStorage.setItem("securescan_user", JSON.stringify(data.user));

  // Rattacher le scan anonyme à ce compte, puis le retirer du localStorage
  if (anonymousScanId) await claimAnonymousScan(anonymousScanId);

  return data;
}

export async function getMe() {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: headers(true),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}

export function logout() {
  localStorage.removeItem("securescan_token");
  localStorage.removeItem("securescan_user");
  localStorage.removeItem("securescan_current_scan");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("securescan_user");
  return u ? JSON.parse(u) : null;
}

// === SCANS ===

export async function createScan(repoUrl: string) {
  const res = await fetch(`${API_URL}/scans`, {
    method: "POST",
    headers: headers(true),
    body: JSON.stringify({ repoUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur lors du scan");
  return data;
}

// Scan via upload ZIP (drag-and-drop ou sélection de fichier)
export async function uploadScanFile(file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const reqHeaders: HeadersInit = {};
  if (token) reqHeaders["Authorization"] = `Bearer ${token}`;
  // NE PAS mettre Content-Type : le navigateur le pose automatiquement avec le boundary multipart

  const res = await fetch(`${API_URL}/scans/upload`, {
    method: "POST",
    headers: reqHeaders,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur lors du scan upload");
  return data;
}

export async function getScan(scanId: number) {
  const res = await fetch(`${API_URL}/scans/${scanId}`, {
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Scan introuvable");
  return data;
}

export async function getScans() {
  const res = await fetch(`${API_URL}/scans`, {
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data.scans;
}

export async function deleteScan(scanId: number) {
  const res = await fetch(`${API_URL}/scans/${scanId}`, {
    method: "DELETE",
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

export async function toggleFavorite(scanId: number) {
  const res = await fetch(`${API_URL}/scans/${scanId}/favorite`, {
    method: "PATCH",
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

// === VULNÉRABILITÉS ===

export async function getVulnerabilities(scanId: number, filters?: { severity?: string; owasp?: string }) {
  const params = new URLSearchParams();
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.owasp) params.set("owasp", filters.owasp);
  const qs = params.toString() ? `?${params}` : "";

  const res = await fetch(`${API_URL}/scans/${scanId}/vulnerabilities${qs}`, {
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data.vulnerabilities;
}

export async function markVulnFixed(scanId: number, vulnId: number) {
  const res = await fetch(`${API_URL}/scans/${scanId}/vulnerabilities/${vulnId}/fix`, {
    method: "PATCH",
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

// Demande un fix IA pour une vulnérabilité (génère ou récupère depuis le cache DB)
export async function requestAiFix(scanId: number, vulnId: number): Promise<{ fixSuggestion: string; cached: boolean }> {
  const res = await fetch(`${API_URL}/scans/${scanId}/vulnerabilities/${vulnId}/ai-fix`, {
    method: "POST",
    headers: headers(true),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur IA");
  return data;
}
export function setCurrentScanId(id: number) {
  localStorage.setItem("securescan_current_scan", String(id));
}

export function getCurrentScanId(): number | null {
  const id = localStorage.getItem("securescan_current_scan");
  return id ? parseInt(id) : null;
}