const simpleGit = require("simple-git");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const env = require("../config/env");

const GitService = {
  /**
   * Clone un repo Git dans un dossier temporaire unique
   * @param {string} repoUrl - URL du dépôt Git
   * @returns {Promise<string>} - Chemin du dossier cloné
   */
  async cloneRepo(repoUrl) {
    // Créer le dossier temporaire s'il n'existe pas
    if (!fs.existsSync(env.TMP_SCAN_DIR)) {
      fs.mkdirSync(env.TMP_SCAN_DIR, { recursive: true });
    }

    // Générer un ID unique pour ce scan
    const scanId = crypto.randomUUID();
    const repoPath = path.join(env.TMP_SCAN_DIR, `scan-${scanId}`);

    console.log(`📂 Clonage de ${repoUrl} dans ${repoPath}...`);

    const git = simpleGit();

    // Clone avec une profondeur limitée pour aller plus vite
    // depth: 50 commits suffisent pour TruffleHog
    await git.clone(repoUrl, repoPath, ["--depth", "50"]);

    console.log(`✅ Clonage terminé : ${repoPath}`);

    return repoPath;
  },

  /**
   * Extrait le nom du repo à partir de l'URL
   * "https://github.com/juice-shop/juice-shop" → "juice-shop/juice-shop"
   */
  extractRepoName(repoUrl) {
    try {
      const url = new URL(repoUrl);
      // Enlève le .git à la fin si présent
      const pathname = url.pathname.replace(/\.git$/, "");
      // Retourne "org/repo" sans le slash initial
      return pathname.replace(/^\//, "");
    } catch {
      return repoUrl;
    }
  },

  /**
   * Détecte le langage principal du repo (basique)
   * Regarde les fichiers à la racine pour deviner
   */
  detectLanguage(repoPath) {
    const indicators = [
      { file: "package.json", lang: "JavaScript" },
      { file: "tsconfig.json", lang: "TypeScript" },
      { file: "requirements.txt", lang: "Python" },
      { file: "Pipfile", lang: "Python" },
      { file: "composer.json", lang: "PHP" },
      { file: "Gemfile", lang: "Ruby" },
      { file: "go.mod", lang: "Go" },
      { file: "pom.xml", lang: "Java" },
      { file: "build.gradle", lang: "Java" },
      { file: "Cargo.toml", lang: "Rust" },
    ];

    for (const { file, lang } of indicators) {
      if (fs.existsSync(path.join(repoPath, file))) {
        return lang;
      }
    }

    return null;
  },

  /**
   * Compte le nombre total de fichiers dans le repo (hors node_modules, .git)
   */
  countFiles(repoPath) {
    let count = 0;

    const walk = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          // Ignore les dossiers inutiles
          if (["node_modules", ".git", "vendor", "__pycache__", "dist", "build"].includes(entry.name)) {
            continue;
          }
          if (entry.isDirectory()) {
            walk(path.join(dir, entry.name));
          } else if (entry.isFile()) {
            count++;
          }
        }
      } catch {
        // Permission denied ou autre erreur — on ignore
      }
    };

    walk(repoPath);
    return count;
  },

  /**
   * Supprime le dossier temporaire du repo cloné
   */
  cleanup(repoPath) {
    try {
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
        console.log(`🗑️ Nettoyage : ${repoPath}`);
      }
    } catch (err) {
      console.error(`⚠️ Erreur nettoyage ${repoPath}:`, err.message);
    }
  },
};

module.exports = GitService;