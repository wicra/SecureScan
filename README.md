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

| Couche      | Technologie              |
|-------------|--------------------------|
| Frontend    | **React** (Vite)         |
| Backend     | **Node.js** (Express)    |
| Base de données | **PostgreSQL**       |
| Analyseurs  | Semgrep, ESLint Security, npm audit, TruffleHog, Bandit |

> 📦 Le frontend et le backend sont dans le **même dépôt** (monorepo).

---

## 🗂️ Structure du projet

```
SecureScan/
│
├── client/                  # 🎨 Frontend React
│   ├── public/
│   └── src/
│       ├── components/      # Composants réutilisables
│       ├── pages/           # Dashboard, Scan, Rapport…
│       ├── services/        # Appels API vers le backend
│       └── App.jsx
│
├── server/                  # 🔧 Backend Node.js / Express
│   ├── routes/              # Endpoints API REST
│   ├── controllers/         # Logique métier
│   ├── services/            # Intégration des analyseurs
│   │   ├── semgrep.js
│   │   ├── eslint.js
│   │   ├── npmAudit.js
│   │   └── trufflehog.js
│   ├── models/              # Modèles BDD
│   └── index.js
│
├── .env.example             # Variables d'environnement
├── docker-compose.yml       # Lancement de tout l'environnement
├── package.json             # Racine du monorepo
└── README.md
```

---

## 🗃️ Base de données — PostgreSQL (schéma minimal)

**3 tables seulement.** Les résultats d'analyse sont stockés en JSON brut dans `scans` et parsés côté React — pas besoin d'une table par vulnérabilité. Seuls les fixes confirmés sont persistés.

```
┌──────────────────────────┐
│          users           │  ← Login / sidebar avatar
├──────────────────────────┤
│ id            SERIAL     │
│ name          VARCHAR    │  "Alice Martin"
│ email         VARCHAR    │  login email/password
│ password_hash TEXT       │  bcrypt
│ github_id     VARCHAR    │  OAuth GitHub
│ avatar_url    TEXT       │
│ role          VARCHAR    │  'analyste' | 'admin'
│ created_at    TIMESTAMP  │
└────────────┬─────────────┘
             │ 1
             ▼ N
┌──────────────────────────────────────────────────────┐
│                        scans                         │  ← Home + Dashboard
├──────────────────────────────────────────────────────┤
│ id              SERIAL                               │
│ user_id         FK → users                           │
│ repo_url        TEXT          "github.com/org/repo"  │
│ repo_name       VARCHAR                              │
│ language        VARCHAR       "JavaScript"           │
│ analyzers       TEXT[]        ['semgrep','eslint',…] │  ← cases cochées Home
│ status          VARCHAR       'pending'|'running'|   │
│                               'completed'|'failed'   │
│ score           INT           23  (score /100)       │
│ vuln_critical   INT           3                      │
│ vuln_high       INT           11                     │
│ vuln_medium     INT           21                     │
│ vuln_low        INT           12                     │
│ secrets_count   INT           5                      │
│ files_total     INT           842                    │
│ results_json    JSONB         résultats bruts de     │
│                               tous les analyseurs    │
│ is_favorite     BOOLEAN       étoile ⭐ sidebar       │
│ created_at      TIMESTAMP                            │
│ completed_at    TIMESTAMP                            │
└───────────────────────┬──────────────────────────────┘
                        │ 1
                        ▼ N
┌──────────────────────────────────────────────────────┐
│                    vuln_fixes                        │  ← bouton "Appliquer le fix"
├──────────────────────────────────────────────────────┤
│ id          SERIAL                                   │
│ scan_id     FK → scans                               │
│ rule_id     VARCHAR    "javascript.express.sqli"     │  clé unique du fix
│ file_path   TEXT       "routes/api.js"               │
│ line_start  INT        127                           │
│ fixed_at    TIMESTAMP                                │
└──────────────────────────────────────────────────────┘
```

**Pourquoi `results_json` (JSONB) ?**
- On stocke une seule fois le résultat brut de Semgrep + ESLint + npm audit + TruffleHog
- React filtre, trie et affiche les vulnérabilités **en mémoire** → pas besoin de 40 colonnes en base
- Pour afficher `is_fixed`, on croise `results_json` avec la table `vuln_fixes` (lookup par `rule_id + file_path + line_start`)
- Les rapports PDF/HTML sont **générés à la demande** depuis `results_json`, non stockés

> **Résultat :** 3 tables, ~15 colonnes utiles, zéro over-engineering — et toute la maquette fonctionne.

---

## 🚀 Lancer le projet

```bash
# 1. Cloner le repo
git clone https://github.com/wicra/SecureScan.git
cd SecureScan

# 2. Installer les dépendances (racine + sous-projets)
npm install
npm install --prefix client
npm install --prefix server

# 3. Configurer les variables d'environnement
cp .env.example .env

# 4. Lancer en développement
npm run dev        # Lance client + server en parallèle
```

Ou avec Docker :

```bash
docker-compose up --build
```

---

## 🔍 Analyseurs intégrés

| Outil              | Rôle                                      |
|--------------------|-------------------------------------------|
| **Semgrep**        | Analyse statique (SAST), 30+ langages     |
| **ESLint Security**| Détection de patterns dangereux en JS     |
| **npm audit**      | Audit des dépendances Node.js             |
| **TruffleHog**     | Détection de secrets dans l'historique Git|
| **Bandit**         | Analyse de sécurité Python                |

---

## 📊 Critères d'évaluation

| Critère         | Poids |
|-----------------|-------|
| Technique       | 40 %  |
| Sécurité OWASP  | 25 %  |
| UX & Rendu      | 20 %  |
| Travail d'équipe| 15 %  |

---

## 🌿 Gestion du travail — Stratégie Git

### Branches principales

| Branche | Rôle |
|---------|------|
| `main`  | 🚀 **Production** — code stable, testé, prêt à présenter. Merge uniquement via PR approuvée. |
| `dev`   | 🔧 **Développement** — branche commune d'intégration. On merge toutes les features ici avant `main`. |

> **Règle d'or :** on ne pousse **jamais** directement sur `main`. Toujours passer par `dev` → PR → `main`.

---

### Branches de fonctionnalité

Toutes les branches de travail partent de `dev` et suivent la convention :

```
feature/backend/<nom-court>     ← Dev backend A & B
feature/frontend/<nom-court>    ← Dev frontend
fix/backend/<nom-court>         ← Correction bug backend
fix/frontend/<nom-court>        ← Correction bug frontend
chore/<nom-court>               ← Config, docs, refacto
```

**Exemples concrets pour ce projet :**

```
feature/backend/auth-login
feature/backend/semgrep-integration
feature/backend/scan-controller
feature/backend/vulnerabilities-api
feature/frontend/dashboard-chart
feature/frontend/scan-form
feature/frontend/results-detail
fix/backend/scan-timeout
chore/db-migrations
```

---

### Workflow au quotidien

```bash
# 1. Toujours partir de dev à jour
git checkout dev
git pull origin dev

# 2. Créer sa branche
git checkout -b feature/backend/semgrep-integration

# 3. Coder, commiter régulièrement
git add .
git commit -m "feat(backend): add semgrep runner service"

# 4. Rester à jour avec dev (rebase recommandé)
git fetch origin
git rebase origin/dev

# 5. Pousser et ouvrir une PR vers dev
git push -u origin feature/backend/semgrep-integration
```

> Ouvrir la PR vers **`dev`**, pas vers `main`. Une fois `dev` stable et testé → PR `dev` → `main` pour la démo/soutenance.

---

### Répartition des branches par personne

| Personne | Branches |
|----------|----------|
| 👤 Dev Backend A | `feature/backend/auth-*`, `feature/backend/scan-*`, `fix/backend/*` |
| 👤 Dev Backend B | `feature/backend/semgrep-*`, `feature/backend/vulnerabilities-*`, `chore/db-*` |
| 👤 Dev Frontend  | `feature/frontend/*`, `fix/frontend/*` |

---

## 🤝 Contribuer

1. Pars toujours de `dev` : `git checkout dev && git pull origin dev`
2. Crée ta branche : `git checkout -b feature/backend/ma-fonctionnalite`
3. Commite avec un message clair : `git commit -m "feat(backend): description"`
4. Rebase sur `dev` avant de pusher : `git rebase origin/dev`
5. Push et ouvre une **Pull Request vers `dev`**
6. Fais relire par au moins 1 autre membre avant de merger

---

*Hackathon IPSSI 2026 — [Page du sujet](https://biynlearning.academy/hackathon-securescan.html)*

