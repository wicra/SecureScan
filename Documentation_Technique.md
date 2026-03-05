# 📘 README-dev — SecureScan

> Documentation technique interne — Hackathon IPSSI 2026

---

## 🗂️ Structure du monorepo

```
SecureScan/
├── front/                        # Next.js 16 + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Accueil (HomeScanBox + drag-and-drop ZIP)
│   │   │   ├── scan/page.tsx         # Progression du scan
│   │   │   ├── dashboard/page.tsx    # Liste des scans utilisateur
│   │   │   ├── results/page.tsx      # Vulnérabilités filtrables + fix IA
│   │   │   ├── report/page.tsx       # Export PDF (jsPDF) / HTML
│   │   │   ├── login/page.tsx        # Login + Register
│   │   │   ├── auth/callback/page.tsx # Callback OAuth GitHub
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── Badge.tsx             # Badge de sévérité coloré
│   │   │   ├── CodeBlock.tsx         # Coloration syntaxique (react-syntax-highlighter)
│   │   │   ├── HomeScanBox.tsx       # Formulaire URL + upload ZIP
│   │   │   ├── Logo.tsx
│   │   │   └── Sidebar.tsx
│   │   └── lib/
│   │       └── api.ts                # Client API complet (fetch + Bearer JWT)
│   ├── next.config.ts
│   ├── postcss.config.mjs            # Tailwind CSS v4
│   └── tsconfig.json
│
├── server/                       # Node.js + Express + Prisma
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js            # Chargement .env + validation des requis
│   │   │   ├── db.js             # Client Prisma singleton
│   │   │   └── tools.js          # PATH étendu pour Semgrep/TruffleHog (Windows)
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── scans.controller.js
│   │   │   └── fixes.controller.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js     # requireAuth / optionalAuth (JWT)
│   │   │   ├── validate.middleware.js # Zod schemas
│   │   │   └── error.middleware.js    # Handler global
│   │   ├── models/
│   │   │   ├── user.model.js
│   │   │   ├── scan.model.js
│   │   │   └── vulnFix.model.js
│   │   ├── routes/
│   │   │   ├── index.js              # /api/auth + /api/scans
│   │   │   ├── auth.routes.js
│   │   │   ├── scans.routes.js
│   │   │   └── fixes.routes.js
│   │   ├── services/
│   │   │   ├── scanner.service.js
│   │   │   ├── git.service.js
│   │   │   ├── semgrep.service.js
│   │   │   ├── eslint.service.js
│   │   │   ├── npmAudit.service.js
│   │   │   ├── trufflehog.service.js
│   │   │   ├── owasp.service.js
│   │   │   ├── score.service.js
│   │   │   ├── ai.service.js
│   │   │   └── upload.service.js
│   │   ├── utils/
│   │   │   ├── safePath.js           # Prévention path traversal
│   │   │   └── spawn.js              # spawnAsync (timeout configurable)
│   │   ├── index.js                  # Démarrage Express
│   │   └── seed-demo.js
│   ├── app.js                        # CORS, morgan, express.json, routes, errorHandler
│   └── .env.example
│
├── design/                       # Wireframes + maquettes Figma
└── README.md
```

---

## ⚙️ Setup développement

### Prérequis

- Node.js 20+, npm 10+
- MySQL 8+
- `pip install semgrep`
- TruffleHog : [github.com/trufflesecurity/trufflehog/releases](https://github.com/trufflesecurity/trufflehog/releases)

### Backend

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev
node src/seed-demo.js    # optionnel
npm run dev              # nodemon src/index.js → http://localhost:3001
```

### Frontend

```bash
cd front
npm install
npm run dev              # → http://localhost:3000
```

---

## 🔧 Variables d'environnement — `server/.env`

```env
PORT=3001
NODE_ENV=development

# MySQL
DATABASE_URL="mysql://root:password@localhost:3306/securescan"

# JWT
JWT_SECRET=chaine_aleatoire_64_chars   # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_EXPIRES_IN=7d

# OAuth GitHub (optionnel)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback

# IA (optionnel — fix on-demand)
OPENROUTER_API_KEY=

# Dossier temporaire pour les repos clonés
TMP_SCAN_DIR=./tmp
```

> `DATABASE_URL` et `JWT_SECRET` sont **obligatoires** — le serveur refuse de démarrer sans eux.

---

## 🗃️ Schéma Prisma — MySQL

```prisma
model User {
  id           Int      @id @default(autoincrement())
  name         String
  email        String   @unique
  passwordHash String?                        // null si OAuth GitHub
  githubId     String?  @unique
  avatarUrl    String?
  role         String   @default("analyste") // analyste | admin
  createdAt    DateTime @default(now())
  scans        Scan[]
  @@map("users")
}

model Scan {
  id            Int       @id @default(autoincrement())
  userId        Int?                           // null = scan anonyme
  user          User?     @relation(...)
  repoUrl       String
  repoName      String?
  language      String?
  branch        String    @default("main")
  status        String    @default("pending") // pending|running|completed|failed
  score         Int       @default(0)         // 0-100
  vulnTotal     Int       @default(0)
  vulnCritical  Int       @default(0)
  vulnHigh      Int       @default(0)
  vulnMedium    Int       @default(0)
  vulnLow       Int       @default(0)
  secretsCount  Int       @default(0)
  filesTotal    Int       @default(0)
  filesImpacted Int       @default(0)
  isFavorite    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
  vulnerabilities Vulnerability[]
  @@map("scans")
}

model Vulnerability {
  id            Int      @id @default(autoincrement())
  scanId        Int
  scan          Scan     @relation(..., onDelete: Cascade)
  tool          String   // semgrep | eslint | npm_audit | trufflehog
  title         String   @db.VarChar(500)
  description   String?  @db.Text
  severity      String   // critical | high | medium | low
  owaspCategory String?  // A01:2025, A05:2025…
  filePath      String?  @db.VarChar(1000)
  lineStart     Int?
  lineEnd       Int?
  ruleId        String?  @db.VarChar(500)
  codeSnippet   String?  @db.Text
  fixSuggestion String?  @db.Text          // généré par IA, mis en cache
  cvssScore     Decimal? @db.Decimal(3, 1)
  isFixed       Boolean  @default(false)
  createdAt     DateTime @default(now())
  @@map("vulnerabilities")
}
```

---

## 🔌 API REST

### Auth — `/api/auth`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Inscription (name, email, password) → JWT |
| POST | `/login` | — | Connexion → JWT |
| GET | `/github` | — | Redirect OAuth GitHub (`?scanId=` optionnel) |
| GET | `/github/callback` | — | Callback → redirect front avec token |
| GET | `/me` | 🔒 | Profil utilisateur connecté |

### Scans — `/api/scans`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | optionnel | Lancer un scan (body: `{ repoUrl }`) |
| POST | `/upload` | optionnel | Scanner un ZIP (multipart, max 50 Mo) |
| GET | `/` | 🔒 | Liste des scans de l'utilisateur |
| GET | `/:id` | optionnel | Détail scan (score seul si non connecté) |
| DELETE | `/:id` | 🔒 | Supprimer un scan |
| PATCH | `/:id/claim` | 🔒 | Rattacher un scan anonyme au compte |
| PATCH | `/:id/favorite` | 🔒 | Toggle favori ⭐ |
| GET | `/:id/vulnerabilities` | 🔒 | Vulnérabilités filtrables (`?severity=&owasp=`) |
| PATCH | `/:id/vulnerabilities/:vulnId/fix` | 🔒 | Marquer une vuln comme fixée |
| POST | `/:id/vulnerabilities/:vulnId/ai-fix` | 🔒 | Générer/récupérer fix IA |

---

## 🔄 Flux complet d'un scan (URL Git)

```
POST /api/scans  { repoUrl: "https://github.com/org/repo" }
  → optionalAuth()                          // JWT optionnel
  → validate(scanSchema)                    // Zod : URL valide
  → ScanController.createScan()
      GitService.extractRepoName(repoUrl)   // "org/repo"
      ScanModel.create({ userId, repoUrl, repoName })
        → INSERT scan status=pending
      ScanModel.markRunning(scan.id)
        → UPDATE scan SET status=running
      GitService.cloneRepo(repoUrl)
        → git clone --depth 500 (simple-git)
        → repoPath = tmp/scan-<uuid>/
      GitService.detectLanguage(repoPath)   // package.json→JS, tsconfig→TS, etc.
      ScanModel.updateLanguage(scan.id, language)
      ScannerService.runFullScan(repoPath)
        → Promise.all([
            SemgrepService.run()            // semgrep --config auto --json
            EslintService.run()             // eslint-plugin-security
            NpmAuditService.run()           // npm audit --json
            TrufflehogService.run()         // trufflehog filesystem --json
          ])
        → OwaspService.mapFindings(allFindings)
            resolveOwasp(ruleId, owaspCategory)
            remapping OWASP 2021 → 2025
            CVSS par défaut : critical=9.8, high=7.5, medium=5.0, low=3.0
        → ScoreService.calculate(mappedVulns)
            pénalités plafonnées par sévérité
            score = max(0, round(100 - totalPenalty))
        → ScoreService.categoryScores()     // barres OWASP dashboard
        → ScoreService.countImpactedFiles() // fichiers uniques impactés
        → grade : ≥80=A, ≥60=B, ≥40=C, ≥20=D, <20=F
      ScanModel.updateStats(scan.id, { score, vulnTotal, ... })
        → UPDATE scan SET status=completed, score=...
      ScanModel.insertVulnerabilities(scan.id, vulnerabilities)
        → INSERT INTO vulnerabilities batch createMany
      GitService.cleanup(repoPath)
        → fs.rmSync(repoPath, { recursive: true, force: true })
← 201 { scanId, repoName, score, grade, totalVulnerabilities, ... }
   Front → redirect /results?id=<scanId>
```

> Si non connecté : réponse limitée à `{ score, grade, totalVulnerabilities }` + message de connexion.

---

## 🏗️ Services — détail

### `GitService`
- `cloneRepo(url)` — clone dans `tmp/scan-<uuid>/` avec `--depth 500` (simple-git)
- `extractRepoName(url)` — `"https://github.com/org/repo"` → `"org/repo"`
- `detectLanguage(path)` — détecte via fichiers indicateurs (package.json, tsconfig.json, requirements.txt, go.mod, pom.xml, Cargo.toml…)
- `countFiles(path)` — compte récursivement (ignore node_modules, .git, vendor, dist)
- `cleanup(path)` — `fs.rmSync` récursif + force

### `ScannerService`
- `runFullScan(repoPath)` — 4 analyseurs en `Promise.all`, logs individuels avec timing
- Retourne : `{ score, grade, totalVulnerabilities, vulnCritical/High/Medium/Low, secretsCount, filesTotal, filesImpacted, categories, vulnerabilities }`

### `SemgrepService`
- Commande : `semgrep --config auto <repoPath> --json --quiet`
- Mapping sévérité : `ERROR→critical`, `WARNING→high`, `INFO→medium`, `NOTE/HINT→low`
- Extrait le contexte de code (±4 lignes) pour le LLM

### `EslintService`
- `eslint-plugin-security` lancé programmatiquement sur les fichiers JS/TS

### `NpmAuditService`
- `npm audit --json` dans le répertoire cloné
- Normalise les `vulnerabilities` → findings standard

### `TrufflehogService`
- `trufflehog filesystem <repoPath> --json`
- Détecte AWS, GitHub tokens, clés privées, etc.

### `OwaspService`
- `mapFindings(findings)` — wrappe chaque finding avec `owaspId`, `owaspName`, `cvssScore`
- `resolveOwasp(ruleId, owaspCategory)` — regex matching sur 30+ patterns
- Remapping complet OWASP 2021→2025 (A03:2021 Injection → A05:2025, A05:2021 Misconfig → A02:2025, etc.)
- CVSS par défaut si absent : critical=9.8, high=7.5, medium=5.0, low=3.0

### `ScoreService`
- `calculate(vulns)` — pénalités plafonnées :

  | Sévérité | Pénalité/vuln | Cap |
  |---|---|---|
  | critical | 20 pts | 40 pts |
  | high | 10 pts | 40 pts |
  | medium | 2 pts | 15 pts |
  | low | 0.5 pts | 5 pts |

- `categoryScores(vulns)` — regroupe par OWASP, calcule `barPercent` relatif au max
- `countImpactedFiles(vulns)` — Set de `filePath` uniques

### `AiService`
- Appel HTTPS vers `openrouter.ai/api/v1/chat/completions`
- Modèles (fallback automatique) : `google/gemma-3-27b-it:free` → `google/gemma-3-12b-it:free`
- Prompt ingénierie : contexte vuln + code snippet + règles strictes (commentaire `// SECURITY FIX:`, pas de prose, code exécutable)
- `getAiFixForVuln(vuln)` — génère et cache en BDD (`fixSuggestion`)
- Timeout 20s, retry sur Rate Limit avec sleep 2s

### `UploadService`
- Extrait le ZIP (adm-zip) dans `tmp/uploads-<uuid>/`
- `cleanup(path)` — nettoyage après scan

---

## 🎨 Frontend — lib/api.ts

Toutes les fonctions exportées du client API :

```typescript
// Auth
login(email, password)          → stocke token + user dans localStorage
register(name, email, password) → idem
logout()                        → vide localStorage
getMe()                         → GET /api/auth/me
isLoggedIn()                    → boolean
getStoredUser()                 → User | null

// Scans
createScan(repoUrl)             → POST /api/scans
uploadScanFile(file)            → POST /api/scans/upload (multipart)
getScan(scanId)                 → GET /api/scans/:id
getScans()                      → GET /api/scans
deleteScan(scanId)              → DELETE /api/scans/:id
toggleFavorite(scanId)          → PATCH /api/scans/:id/favorite
setCurrentScanId(id)            → localStorage (scan anonyme en cours)
getCurrentScanId()              → number | null

// Vulnérabilités
getVulnerabilities(scanId, filters?)  → GET /api/scans/:id/vulnerabilities
markVulnFixed(scanId, vulnId)         → PATCH .../fix
requestAiFix(scanId, vulnId)          → POST .../ai-fix → { fixSuggestion, cached }
```

> Après login/register, si un scan anonyme était en cours (`securescan_current_scan` en localStorage), il est automatiquement rattaché au compte via `PATCH /api/scans/:id/claim`.

---

## 🚨 Points de vigilance

- **`.env` ne doit jamais être commité** (dans `.gitignore`)
- **Ne jamais pousser directement sur `main`**
- Clonage de repo = surface d'attaque → `safePath.js` prévient le path traversal, `--depth 500` limite l'historique, `cleanup()` supprime tout après
- `TMP_SCAN_DIR` doit avoir les droits en écriture
- Sur Windows : `tools.js` étend le PATH pour trouver Semgrep (Python Scripts) et TruffleHog (LOCALAPPDATA)
- Fix IA nécessite `OPENROUTER_API_KEY` — sans clé, l'endpoint retourne une erreur 500

---

## 🌿 Convention Git

```
feat(scope): description    # nouvelle fonctionnalité
fix(scope): description     # correction de bug
chore(scope): description   # config, deps, docs
refactor(scope): description
```

| Personne | Périmètre |
|---|---|
| Dev Backend A | Auth, ScanController, routes, middlewares, models |
| Dev Backend B | ScannerService, analyseurs, OwaspService, ScoreService, AiService |
| Dev Frontend | Pages Next.js, composants, lib/api.ts |

---

## 📦 Dépendances principales

### Server
`express`, `@prisma/client`, `simple-git`, `bcryptjs`, `jsonwebtoken`, `zod`, `multer`, `adm-zip`, `cors`, `morgan`, `dotenv`

### Front
`next 16`, `react 19`, `tailwindcss 4`, `lucide-react`, `react-syntax-highlighter`, `jspdf`, `jszip`

---

## 📦 Releases

| Version | Date | Notes |
|---|---|---|
| v1.1.0 | 04/03/2026 | [GitHub Releases](https://github.com/wicra/SecureScan/releases/tag/v1.1.0) |
| v1.0.0 | 02/03/2026 | Release initiale |

---

*Hackathon IPSSI 2026 — [wicra/SecureScan](https://github.com/wicra/SecureScan)*
