# 🛡️ SecureScan

> **Hackathon IPSSI 2026** — Semaine du 2 au 6 mars 2026  
> Plateforme web d'analyse de qualité & sécurité de code, basée sur l'OWASP Top 10 2025.

---

## 📌 C'est quoi ?

SecureScan est une **plateforme web** qui analyse automatiquement le code d'un dépôt Git à la recherche de **failles de sécurité**.

L'idée est simple :

1. Tu entres l'URL d'un repo Git **ou tu uploades un ZIP**
2. La plateforme clone le repo et lance les analyseurs en parallèle
3. Elle affiche un **dashboard clair** avec les vulnérabilités détectées, classées selon l'OWASP Top 10 2025
4. Elle propose des **corrections IA on-demand** via OpenRouter
5. Elle génère un **rapport PDF/HTML** exportable

> Les scans anonymes sont possibles (sans compte). La connexion débloque le détail complet des vulnérabilités et l'historique.

---

## ⚙️ Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | **Next.js 16** + TypeScript + Tailwind CSS |
| Backend | **Node.js** + Express + JavaScript |
| ORM / BDD | **Prisma 5** + MySQL 8 |
| IA | **OpenRouter** (Gemma 3 27B / 12B — gratuit) |
| Analyseurs | Semgrep, ESLint Security, npm audit, TruffleHog |

> 📦 Frontend (`front/`) et backend (`server/`) dans le **même dépôt** (monorepo).

---

## 🗂️ Structure du projet

```
SecureScan/
│
├── front/                        # 🎨 Frontend Next.js + TypeScript
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Accueil — formulaire scan + drag-and-drop ZIP
│   │   │   ├── scan/page.tsx     # Page scan en cours (progression)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── results/page.tsx  # Détail vulnérabilités + fix IA
│   │   │   ├── report/page.tsx   # Rapport PDF/HTML
│   │   │   ├── login/page.tsx
│   │   │   └── auth/callback/page.tsx  # Callback OAuth GitHub
│   │   ├── components/
│   │   │   ├── Badge.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── HomeScanBox.tsx
│   │   │   ├── Logo.tsx
│   │   │   └── Sidebar.tsx
│   │   └── lib/
│   │       └── api.ts            # Client API (fetch + JWT)
│   ├── next.config.ts
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   └── tsconfig.json
│
├── server/                       # 🔧 Backend Node.js / Express
│   ├── prisma/
│   │   └── schema.prisma         # Schéma MySQL (User, Scan, Vulnerability)
│   ├── src/
│   │   ├── config/               # env.js, db.js, tools.js (PATH binaires)
│   │   ├── controllers/          # auth.controller.js, scans.controller.js
│   │   ├── middlewares/          # auth, validate (Zod), error
│   │   ├── models/               # user.model.js, scan.model.js, vulnFix.model.js
│   │   ├── routes/               # auth.routes.js, scans.routes.js
│   │   ├── services/
│   │   │   ├── scanner.service.js    # Orchestrateur (4 analyseurs en parallèle)
│   │   │   ├── git.service.js        # Clone, détection langage, cleanup
│   │   │   ├── semgrep.service.js    # SAST multi-langages
│   │   │   ├── eslint.service.js     # Patterns dangereux JS/TS
│   │   │   ├── npmAudit.service.js   # Dépendances vulnérables
│   │   │   ├── trufflehog.service.js # Secrets dans les fichiers
│   │   │   ├── owasp.service.js      # Mapping OWASP 2021→2025 + CVSS
│   │   │   ├── score.service.js      # Calcul score + catégories
│   │   │   ├── ai.service.js         # Fix IA on-demand (OpenRouter)
│   │   │   └── upload.service.js     # Extraction ZIP
│   │   ├── utils/
│   │   │   ├── safePath.js       # Sécurité path traversal
│   │   │   └── spawn.js          # spawnAsync pour les binaires
│   │   ├── index.js              # Démarrage serveur
│   │   └── seed-demo.js          # Données de démo
│   ├── app.js                    # Config Express (CORS, morgan, routes)
│   └── .env.example
│
├── design/                       # 🎨 Wireframes + maquettes couleur (Figma)
├── .gitignore
├── README-dev.md
└── README.md
```

---

## 🗃️ Base de données — MySQL via Prisma

**3 tables.** Pas de `resultsJson` — les vulnérabilités sont stockées ligne par ligne pour permettre le filtrage.

```
users           → id, name, email, passwordHash, githubId, avatarUrl, role, createdAt
scans           → id, userId, repoUrl, repoName, language, branch, status,
                  score, vulnTotal, vulnCritical/High/Medium/Low,
                  secretsCount, filesTotal, filesImpacted, isFavorite,
                  createdAt, completedAt
vulnerabilities → id, scanId, tool, title, description, severity, owaspCategory,
                  filePath, lineStart, lineEnd, ruleId, codeSnippet,
                  fixSuggestion, cvssScore, isFixed, createdAt
```

> Les scans anonymes (`userId = null`) sont supportés. Après connexion, le scan est rattaché via `PATCH /api/scans/:id/claim`.

---

## 🚀 Lancer le projet

### Prérequis

- Node.js 20+, npm 10+
- MySQL 8+
- Semgrep (`pip install semgrep`)
- TruffleHog ([releases GitHub](https://github.com/trufflesecurity/trufflehog/releases))

### Installation

```bash
# 1. Cloner
git clone https://github.com/wicra/SecureScan.git
cd SecureScan

# 2. Backend
cd server
cp .env.example .env          # remplir DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev        # crée les tables MySQL
node src/seed-demo.js         # optionnel : 3 scans de démo
npm run dev                   # → http://localhost:3001

# 3. Frontend (autre terminal)
cd ../front
npm install
npm run dev                   # → http://localhost:3000
```

---

## 🔍 Analyseurs intégrés

| Outil | Rôle |
| --- | --- |
| **Semgrep** | Analyse statique (SAST), 30+ langages, remapping OWASP 2021→2025 |
| **ESLint Security** | Détection de patterns dangereux JS/TS (`eslint-plugin-security`) |
| **npm audit** | Vulnérabilités dans les dépendances Node.js |
| **TruffleHog** | Détection de secrets et credentials dans les fichiers |

Les 4 analyseurs tournent **en parallèle** via `Promise.all`. Résultats normalisés et mappés sur l'OWASP Top 10 2025 par `OwaspService`.

### Formule de score (0 = compromis, 100 = propre)

| Sévérité | Pénalité / vuln | Plafond |
| --- | --- | --- |
| Critical | −20 pts | max −40 pts |
| High | −10 pts | max −40 pts |
| Medium | −2 pts | max −15 pts |
| Low | −0.5 pts | max −5 pts |

---

## 🤖 Fix IA (OpenRouter)

Le service `AiService` génère un correctif de code pour une vulnérabilité à la demande.

- Modèle principal : `google/gemma-3-27b-it:free`
- Fallback : `google/gemma-3-12b-it:free`
- Le fix est **mis en cache en BDD** pour éviter de rappeler l'IA
- Prompt strict : correction minimale, commentaire `// SECURITY FIX:`, pas de prose

---

## 🎨 Design

> 🔗 **[Figma](https://www.figma.com/design/tk9NicbQPEJ2HZPZHk80Hr/SecureScan)**

Pages maquettées (wireframe + couleur dark mode) : Connexion, Accueil, Dashboard connecté / non connecté, Résultats, Rapport. Disponibles dans [`design/`](./design/).

---

## 📊 Critères d'évaluation

| Critère | Poids |
| --- | --- |
| Technique | 40 % |
| Sécurité OWASP | 25 % |
| UX & Rendu | 20 % |
| Travail d'équipe | 15 % |

---

## 🌿 Stratégie Git

| Branche | Rôle |
| --- | --- |
| `main` | 🚀 Production — merge via PR uniquement |
| `dev` | 🔧 Intégration — toutes les features mergent ici |

```
feature/backend/<nom>   feature/frontend/<nom>
fix/backend/<nom>       fix/frontend/<nom>
chore/<nom>
```

```bash
git checkout dev && git pull origin dev
git checkout -b feature/backend/ma-feature
git commit -m "feat(backend): description"
git rebase origin/dev
git push -u origin feature/backend/ma-feature
# → PR vers dev, jamais vers main
```

---

*Hackathon IPSSI 2026 — [Page du sujet](https://biynlearning.academy/hackathon-securescan.html)*
