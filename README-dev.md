# 🔧 SecureScan — Backend

> Node.js · Express · PostgreSQL · Prisma ORM  
> Ce dossier contient **toute la logique serveur** : API REST, orchestration des analyseurs, gestion de la BDD.

> 💡 **Philosophie :** schéma BDD minimal — 3 tables uniquement. Les résultats d'analyse vivent en `JSONB` dans `scans.results_json` et sont parsés côté React. Seuls les fixes confirmés sont persistés dans `vuln_fixes`.

---

## 🏗️ Structure complète du dossier

```
server/
│
├── prisma/
│   ├── schema.prisma          # Schéma BDD — 3 tables : users, scans, vuln_fixes
│   └── migrations/            # Migrations auto-générées par Prisma
│       └── 20260302_init/     # Création des 3 tables
│
├── src/
│   │
│   ├── routes/                # Déclaration des endpoints Express
│   │   ├── auth.routes.js     # POST /auth/login, /auth/register, /auth/github
│   │   ├── scans.routes.js    # POST /scans, GET /scans, GET /scans/:id
│   │   ├── fixes.routes.js    # POST /scans/:id/fixes  (persister un fix)
│   │   └── index.js           # Agrège toutes les routes
│   │
│   ├── controllers/           # Logique métier (appelée par les routes)
│   │   ├── auth.controller.js
│   │   ├── scans.controller.js
│   │   └── fixes.controller.js
│   │
│   ├── services/              # Cœur du projet : orchestration des analyseurs
│   │   ├── git.service.js     # Clone le repo Git (simple-git)
│   │   ├── semgrep.service.js # Lance Semgrep, parse le JSON
│   │   ├── eslint.service.js  # Lance ESLint Security, parse le JSON
│   │   ├── npmAudit.service.js# Lance npm audit, parse le JSON
│   │   ├── trufflehog.service.js # Lance TruffleHog, parse le JSON
│   │   ├── scanner.service.js # Orchestrateur : lance tous les analyseurs
│   │   │                      # → produit results_json stocké dans scans
│   │   ├── owasp.service.js   # Mappe les check_id vers OWASP Top 10
│   │   ├── score.service.js   # Calcule le score /100 (pondéré par sévérité)
│   │   └── ai.service.js      # Appel LLM pour suggestions de fix (bonus)
│   │
│   ├── models/                # Accès BDD via Prisma (thin wrappers)
│   │   ├── user.model.js
│   │   ├── scan.model.js
│   │   └── vulnFix.model.js   # Seulement les fixes persistés
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js  # Vérifie le JWT
│   │   ├── error.middleware.js # Gestion centralisée des erreurs
│   │   └── validate.middleware.js # Validation des body (zod)
│   │
│   ├── config/
│   │   ├── db.js              # Instance Prisma Client (singleton)
│   │   └── env.js             # Chargement et validation des variables d'env
│   │
│   └── index.js               # Point d'entrée Express
│
├── .env.example
├── package.json
└── README.md                  # ← ce fichier
```

---

## 🗄️ ORM — Pourquoi Prisma ?

On utilise **[Prisma](https://www.prisma.io/)** comme ORM.

| Critère | Prisma | Sequelize | Knex |
|---------|--------|-----------|------|
| Prise en main rapide | ✅ | ⚠️ | ❌ |
| Auto-complétion TypeScript | ✅ | ⚠️ | ❌ |
| Migrations intégrées | ✅ | ⚠️ | ✅ |
| Lisibilité du schéma | ✅ | ❌ | ❌ |
| Adapté en hackathon | ✅ | ⚠️ | ❌ |

> Prisma génère automatiquement les migrations à partir du `schema.prisma` et offre une auto-complétion parfaite. **On gagne un temps précieux.**

### Commandes Prisma essentielles

```bash
# Appliquer les migrations en dev (après modification du schema)
npx prisma migrate dev --name nom_de_la_migration

# Générer le client Prisma (après un pull)
npx prisma generate

# Voir la BDD dans l'interface web Prisma Studio
npx prisma studio

# Reset complet de la BDD (⚠️ efface tout)
npx prisma migrate reset
```

---

## 👥 Répartition entre les 2 devs backend

### Dev Backend A — Auth + Scans + Orchestration

**Branches :**
```
feature/backend/auth-register-login
feature/backend/auth-github-oauth
feature/backend/scan-create-endpoint
feature/backend/scanner-orchestrator
feature/backend/git-clone-service
fix/backend/...
```

**Fichiers à sa charge :**
```
src/routes/auth.routes.js
src/controllers/auth.controller.js
src/routes/scans.routes.js
src/controllers/scans.controller.js
src/services/git.service.js
src/services/scanner.service.js
src/middlewares/auth.middleware.js
src/config/env.js
```

**Tâches concrètes :**
- [ ] `POST /auth/register` — créer un compte (bcrypt + JWT)
- [ ] `POST /auth/login` — login email/password
- [ ] `GET /auth/github` — OAuth GitHub
- [ ] `POST /scans` — créer un scan (cloner le repo, lancer l'orchestrateur)
- [ ] `GET /scans` — liste des scans de l'utilisateur connecté
- [ ] `GET /scans/:id` — détail d'un scan (stats, score)
- [ ] Orchestrateur : appeler chaque service analyseur en parallèle (`Promise.all`)
- [ ] Calcul du score global `/100`

---

### Dev Backend B — Analyseurs + Fixes + Rapport

**Branches :**
```
feature/backend/semgrep-service
feature/backend/eslint-service
feature/backend/npm-audit-service
feature/backend/trufflehog-service
feature/backend/owasp-mapping
feature/backend/fixes-api
feature/backend/report-generation
fix/backend/...
```

**Fichiers à sa charge :**
```
src/services/semgrep.service.js
src/services/eslint.service.js
src/services/npmAudit.service.js
src/services/trufflehog.service.js
src/services/owasp.service.js
src/services/score.service.js
src/services/ai.service.js           ← bonus IA
src/routes/fixes.routes.js
src/controllers/fixes.controller.js
src/models/vulnFix.model.js
```

**Tâches concrètes :**
- [ ] `semgrep.service.js` — exécuter Semgrep via `child_process`, parser le JSON
- [ ] `eslint.service.js` — idem pour ESLint Security
- [ ] `npmAudit.service.js` — idem pour `npm audit --json`
- [ ] `trufflehog.service.js` — idem pour TruffleHog
- [ ] `owasp.service.js` — mapper les `check_id` vers les catégories OWASP Top 10 (table de correspondance statique)
- [ ] `score.service.js` — score pondéré : critical×10 + high×5 + medium×2 + low×1, normalisé /100
- [ ] `GET /scans/:id/fixes` — liste des fixes persistés
- [ ] `POST /scans/:id/fixes` — enregistrer un fix (`rule_id + file_path + line_start`)
- [ ] `DELETE /scans/:id/fixes/:fixId` — annuler un fix
- [ ] `GET /scans/:id/report?format=pdf` — générer et streamer le rapport (lib `puppeteer`)
- [ ] `ai.service.js` — appel Anthropic API, retourner suggestion de fix ← bonus

---

## 🗺️ Routes API complètes

```
AUTH
  POST   /api/auth/register              ← A
  POST   /api/auth/login                 ← A
  GET    /api/auth/github                ← A
  GET    /api/auth/me                    ← A

SCANS
  POST   /api/scans                      ← A  (body: { repo_url, analyzers[] })
  GET    /api/scans                      ← A  (liste de l'utilisateur)
  GET    /api/scans/:id                  ← A  (dashboard stats)
  DELETE /api/scans/:id                  ← A
  PATCH  /api/scans/:id/favorite         ← A  (toggle ⭐)

VULNERABILITÉS
  GET    /api/scans/:id/vulnerabilities  ← B  (?severity=critical&owasp=A05)
  GET    /api/scans/:id/vulnerabilities/:vulnId  ← B  (détail)
  PATCH  /api/scans/:id/vulnerabilities/:vulnId/fix  ← B  (appliquer fix)

RAPPORTS
  POST   /api/reports                    ← B  (body: { scan_id, format, language })
  GET    /api/reports/:id                ← B
  GET    /api/reports/:id/download       ← B
```

---

## 🔑 Variables d'environnement

Copier `.env.example` → `.env` :

```env
# Serveur
PORT=3001
NODE_ENV=development

# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/securescan"

# Auth
JWT_SECRET=votre_secret_jwt_super_long
JWT_EXPIRES_IN=7d

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback

# IA (bonus)
ANTHROPIC_API_KEY=

# Dossier temporaire pour les repos clonés
TMP_SCAN_DIR=/tmp/securescan-repos
```

---

## 🚀 Lancer le backend seul

```bash
cd server

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# → Remplir DATABASE_URL et JWT_SECRET

# Appliquer les migrations et générer le client Prisma
npx prisma migrate dev --name init
npx prisma generate

# Lancer en mode développement (hot-reload)
npm run dev
```

Le serveur tourne sur **http://localhost:3001**

---

## 🌿 Workflow Git pour les backend devs

```bash
# Départ : toujours depuis dev à jour
git checkout dev
git pull origin dev

# Créer sa branche
git checkout -b feature/backend/semgrep-service

# Coder...
git add .
git commit -m "feat(backend): parse semgrep JSON output and normalize results"

# Rester à jour avec dev avant de pousser
git fetch origin
git rebase origin/dev

# Push et PR vers dev (pas main !)
git push -u origin feature/backend/semgrep-service
```

### Convention de commit

```
feat(backend): description courte
fix(backend): correction d'un bug
chore(db): ajout migration scans
test(backend): tests unitaires scanner service
refactor(backend): refacto owasp mapping
```

---

## 📦 Dépendances principales

```json
{
  "dependencies": {
    "express": "^4.18",
    "@prisma/client": "^5.x",
    "bcryptjs": "^2.4",
    "jsonwebtoken": "^9.x",
    "zod": "^3.x",
    "simple-git": "^3.x",
    "puppeteer": "^21.x",
    "cors": "^2.8",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "prisma": "^5.x",
    "nodemon": "^3.x",
    "jest": "^29.x",
    "supertest": "^6.x"
  }
}
```

> `puppeteer` sert uniquement pour `GET /scans/:id/report` — génération à la volée, rien n'est stocké.
```

---

*→ README Frontend : [`client/README.md`](../client/README.md)*  
*→ README global : [`README.md`](../README.md)*
