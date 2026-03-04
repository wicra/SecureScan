# 🛡️ SecureScan

> **Hackathon IPSSI 2026** — Semaine du 2 au 6 mars 2026  
> Plateforme web d'analyse de sécurité de code, basée sur l'OWASP Top 10.

---

## 📌 C'est quoi ?

SecureScan est une **plateforme web** qui analyse automatiquement le code d'un dépôt Git à la recherche de **failles de sécurité**.

L'idée est simple :

1. Tu entres l'URL d'un repo Git (ou tu uploades ton code)
2. La plateforme lance des outils d'analyse en arrière-plan
3. Elle affiche un **dashboard clair** avec les vulnérabilités détectées, classées selon l'OWASP Top 10
4. Elle propose des **corrections automatiques** pour les failles courantes
5. Elle génère un **rapport PDF/HTML** prêt à être présenté

---

## ⚙️ Stack technique

| Couche | Technologie |
|---|---|
| Frontend | **React** (Vite) + TypeScript |
| Backend | **Node.js** (Express) + TypeScript |
| Base de données | **PostgreSQL** |
| Analyseurs | Semgrep, ESLint Security, npm audit, TruffleHog, Bandit |

> 📦 Le frontend et le backend sont dans le **même dépôt** (monorepo).

---

## 🗂️ Structure du projet

```
SecureScan/
│
├── front/                   # 🎨 Frontend React + TypeScript
│   └── src/
│       ├── components/      # Composants réutilisables
│       ├── pages/           # Dashboard, Scan, Rapport…
│       ├── services/        # Appels API vers le backend
│       └── App.tsx
│
├── server/                  # 🔧 Backend Node.js / Express + TypeScript
│   ├── routes/              # Endpoints API REST
│   ├── controllers/         # Logique métier
│   ├── services/            # Intégration des analyseurs
│   │   ├── semgrep.ts
│   │   ├── eslint.ts
│   │   ├── npmAudit.ts
│   │   └── trufflehog.ts
│   ├── models/              # Modèles BDD
│   └── index.ts
│
├── design/                  # 🎨 Maquettes et assets design
├── .gitignore
├── README-dev.md            # Documentation technique détaillée
└── README.md
```

---

## 🗃️ Base de données — PostgreSQL (schéma minimal)

**3 tables seulement.** Les résultats d'analyse sont stockés en JSON brut dans `scans` et parsés côté React — pas besoin d'une table par vulnérabilité.

```
┌──────────────────────────┐
│          users           │  ← Login / sidebar avatar
├──────────────────────────┤
│ id            SERIAL     │
│ name          VARCHAR    │
│ email         VARCHAR    │
│ password_hash TEXT       │  bcrypt
│ github_id     VARCHAR    │  OAuth GitHub
│ avatar_url    TEXT       │
│ role          VARCHAR    │  'analyste' | 'admin'
│ created_at    TIMESTAMP  │
└────────────┬─────────────┘
             │ 1
             ▼ N
┌──────────────────────────────────────────────────────┐
│                        scans                         │
├──────────────────────────────────────────────────────┤
│ id              SERIAL                               │
│ user_id         FK → users                           │
│ repo_url        TEXT                                 │
│ repo_name       VARCHAR                              │
│ language        VARCHAR                              │
│ analyzers       TEXT[]                               │
│ status          VARCHAR   'pending'|'running'|       │
│                           'completed'|'failed'       │
│ score           INT       (score /100)               │
│ vuln_critical   INT                                  │
│ vuln_high       INT                                  │
│ vuln_medium     INT                                  │
│ vuln_low        INT                                  │
│ secrets_count   INT                                  │
│ files_total     INT                                  │
│ results_json    JSONB     résultats bruts analyseurs │
│ is_favorite     BOOLEAN                              │
│ created_at      TIMESTAMP                            │
│ completed_at    TIMESTAMP                            │
└───────────────────────┬──────────────────────────────┘
                        │ 1
                        ▼ N
┌──────────────────────────────────────────────────────┐
│                    vuln_fixes                        │
├──────────────────────────────────────────────────────┤
│ id          SERIAL                                   │
│ scan_id     FK → scans                               │
│ rule_id     VARCHAR                                  │
│ file_path   TEXT                                     │
│ line_start  INT                                      │
│ fixed_at    TIMESTAMP                                │
└──────────────────────────────────────────────────────┘
```

> Les rapports PDF/HTML sont **générés à la demande** depuis `results_json`, non stockés en base.

---

## 🚀 Lancer le projet

```bash
# 1. Cloner le repo
git clone https://github.com/wicra/SecureScan.git
cd SecureScan

# 2. Installer les dépendances
cd front && npm install
cd ../server && npm install

# 3. Configurer les variables d'environnement
cp .env.example .env

# 4. Lancer en développement
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd front && npm run dev
```

---

## 🔍 Analyseurs intégrés

| Outil | Rôle |
|---|---|
| **Semgrep** | Analyse statique (SAST), 30+ langages |
| **ESLint Security** | Détection de patterns dangereux en JS/TS |
| **npm audit** | Audit des dépendances Node.js |
| **TruffleHog** | Détection de secrets dans l'historique Git |
| **Bandit** | Analyse de sécurité Python |

---

## 📊 Critères d'évaluation

| Critère | Poids |
|---|---|
| Technique | 40 % |
| Sécurité OWASP | 25 % |
| UX & Rendu | 20 % |
| Travail d'équipe | 15 % |

---

## 🌿 Gestion du travail — Stratégie Git

### Branches principales

| Branche | Rôle |
|---|---|
| `main` | 🚀 **Production** — code stable, prêt à présenter. Merge uniquement via PR approuvée. |
| `dev` | 🔧 **Développement** — branche d'intégration commune. Toutes les features mergent ici avant `main`. |

> **Règle d'or :** on ne pousse **jamais** directement sur `main`.

### Branches de fonctionnalité

```
feature/backend/<nom-court>
feature/frontend/<nom-court>
fix/backend/<nom-court>
fix/frontend/<nom-court>
chore/<nom-court>
```

### Workflow au quotidien

```bash
git checkout dev && git pull origin dev
git checkout -b feature/backend/ma-feature

# ... coder ...

git add . && git commit -m "feat(backend): description"
git rebase origin/dev
git push -u origin feature/backend/ma-feature
# → ouvrir PR vers dev
```

---

## 🤝 Contribuer

1. Toujours partir de `dev` à jour
2. Créer sa branche depuis `dev`
3. Commiter avec des messages clairs (`feat:`, `fix:`, `chore:`)
4. Rebase sur `dev` avant de pusher
5. Ouvrir une **Pull Request vers `dev`**, jamais vers `main`
6. Faire relire par au moins 1 autre membre

---

*Hackathon IPSSI 2026 — [Page du sujet](https://biynlearning.academy/hackathon-securescan.html)*
