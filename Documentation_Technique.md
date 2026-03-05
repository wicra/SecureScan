# 📘 README-dev — SecureScan

> Documentation technique interne — Hackathon IPSSI 2026

---

## 🗂️ Structure du monorepo

```
SecureScan/
├── front/          # React + Vite + TypeScript
├── server/         # Node.js + Express + TypeScript
├── design/         # Maquettes / assets
├── .gitignore
├── README.md
└── README-dev.md
```

---

## ⚙️ Setup développement

### Prérequis

- Node.js 20+
- PostgreSQL 15+
- npm 10+

### Installation

```bash
# Frontend
cd front
npm install
npm run dev        # → http://localhost:5173

# Backend
cd server
npm install
npm run dev        # → http://localhost:3000
```

### Variables d'environnement — `server/.env`

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/securescan
JWT_SECRET=ton_secret_jwt
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## 🗃️ Base de données

### Connexion

```bash
psql -U postgres
CREATE DATABASE securescan;
```

### Migration (à la main pour l'instant)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  github_id VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'analyste',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scans (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  repo_url TEXT NOT NULL,
  repo_name VARCHAR(255),
  language VARCHAR(50),
  analyzers TEXT[],
  status VARCHAR(20) DEFAULT 'pending',
  score INT,
  vuln_critical INT DEFAULT 0,
  vuln_high INT DEFAULT 0,
  vuln_medium INT DEFAULT 0,
  vuln_low INT DEFAULT 0,
  secrets_count INT DEFAULT 0,
  files_total INT DEFAULT 0,
  results_json JSONB,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE vuln_fixes (
  id SERIAL PRIMARY KEY,
  scan_id INT REFERENCES scans(id),
  rule_id VARCHAR(255),
  file_path TEXT,
  line_start INT,
  fixed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API REST — Endpoints

### Auth

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription email/password |
| POST | `/api/auth/login` | Connexion → JWT |
| GET | `/api/auth/github` | OAuth GitHub redirect |
| GET | `/api/auth/github/callback` | Callback GitHub |

### Scans

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/scans` | Lancer un nouveau scan |
| GET | `/api/scans` | Liste des scans de l'utilisateur |
| GET | `/api/scans/:id` | Détail d'un scan |
| PATCH | `/api/scans/:id/favorite` | Toggle favori |
| DELETE | `/api/scans/:id` | Supprimer un scan |

### Vulnérabilités

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/scans/:id/vulns` | Liste des vulnérabilités du scan |
| POST | `/api/scans/:id/fixes` | Appliquer un fix |

### Rapports

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/scans/:id/report/pdf` | Générer rapport PDF |
| GET | `/api/scans/:id/report/html` | Générer rapport HTML |

---

## 🔍 Analyseurs — Intégration

### Semgrep

```bash
semgrep --config=auto --json <chemin_repo>
```

Parsing de la sortie JSON → extraction `results[]` avec `check_id`, `path`, `start.line`, `severity`, `message`.

### ESLint Security

Plugin `eslint-plugin-security` — config `.eslintrc` fournie dans `server/services/`.

### npm audit

```bash
npm audit --json
```

Champ `vulnerabilities` → on extrait `severity`, `name`, `via`.

### TruffleHog

```bash
trufflehog filesystem <chemin_repo> --json
```

Détection de secrets dans les fichiers et l'historique Git.

### Bandit (Python)

```bash
bandit -r <chemin_repo> -f json
```

Utilisé uniquement si des fichiers `.py` sont détectés dans le repo scanné.

---

## 🧱 Architecture frontend (React + TypeScript)

```
front/src/
├── components/
│   ├── layout/          # Sidebar, Navbar, Layout wrapper
│   ├── scan/            # ScanForm, ScanCard, ScanStatus
│   ├── vulns/           # VulnList, VulnDetail, SeverityBadge
│   └── charts/          # ScoreGauge, OwaspChart, SeverityPie
├── pages/
│   ├── Home.tsx          # Formulaire de scan + historique
│   ├── Dashboard.tsx     # Vue d'ensemble d'un scan
│   ├── Vulnerabilities.tsx
│   ├── Secrets.tsx
│   ├── Report.tsx
│   └── Login.tsx
├── services/
│   ├── api.ts            # Axios instance + interceptors JWT
│   ├── scans.ts
│   └── auth.ts
├── hooks/
│   ├── useAuth.ts
│   └── useScan.ts
├── types/
│   └── index.ts          # Interfaces TypeScript
└── App.tsx
```

---

## 🔐 Authentification

- JWT stocké en `localStorage`
- Axios interceptor ajoute le header `Authorization: Bearer <token>` automatiquement
- OAuth GitHub → `passport-github2` côté serveur

---

## 🌿 Convention Git

### Commits

Format : `type(scope): message`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `chore` | Config, deps, docs |
| `refactor` | Refacto sans changement fonctionnel |
| `style` | CSS / formatting |

Exemples :
```
feat(backend): add semgrep runner service
fix(frontend): correct scan status polling
chore(db): add vuln_fixes migration
```

### Branches

```
feature/backend/<nom>
feature/frontend/<nom>
fix/backend/<nom>
fix/frontend/<nom>
chore/<nom>
```

### Répartition

| Personne | Périmètre |
|---|---|
| Dev Backend A | Auth, scan controller, API REST |
| Dev Backend B | Intégration analyseurs, jobs async, rapport |
| Dev Frontend | Toutes les pages React, composants, appels API |

---

## 🚨 Points de vigilance

- **Ne jamais commit de secrets** (`.env` dans `.gitignore`)
- **Toujours rebase sur `dev`** avant d'ouvrir une PR
- **Ne jamais pousser directement sur `main`**
- Les scans sont potentiellement longs → prévoir un **polling** côté frontend sur le statut (`pending` → `running` → `completed`)
- Le clonage de repo Git côté serveur = **surface d'attaque** → sandbox / timeout obligatoire

---

## 📦 Releases

| Version | Date | Notes |
|---|---|---|
| v1.1.0 | 04/03/2026 | Dernière release — voir [GitHub Releases](https://github.com/wicra/SecureScan/releases) |
| v1.0.0 | 02/03/2026 | Release initiale |

---

*Hackathon IPSSI 2026 — [wicra/SecureScan](https://github.com/wicra/SecureScan)*
