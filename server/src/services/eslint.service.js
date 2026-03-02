const { execFileSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

// CORRESPONDANCE SÉVÉRITÉ ESLINT (0/1/2) → FORMAT INTERNE
const SEVERITY_MAP = {
  2: 'high',
  1: 'medium',
  0: 'low',
};

// CONFIG ESLINT INJECTÉE À LA VOLÉE — PAS BESOIN D'UN .eslintrc DANS LE REPO CIBLE
const ESLINT_CONFIG = {
  env:     { browser: true, node: true, es2021: true },
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules:   {},
};

/**
 * Exécute ESLint (plugin security) sur un repo local et retourne les vulnérabilités normalisées.
 *
 * @param {string} repoPath - Chemin absolu du repo cloné
 * @returns {Array<Object>} Vulnérabilités au format standard
 */
function runEslint(repoPath) {
  const absPath    = path.resolve(repoPath);
  const configPath = path.join(absPath, '.eslint-securescan.json');

  // FICHIER DE CONFIG TEMPORAIRE — SUPPRIMÉ APRÈS ANALYSE
  fs.writeFileSync(configPath, JSON.stringify(ESLINT_CONFIG, null, 2));

  let raw;
  try {
    raw = execFileSync(
      'npx',
      [
        'eslint',
        absPath,
        '--config', configPath,
        '--format', 'json',
        '--ext',    '.js,.ts,.jsx,.tsx',
        '--no-eslintrc',
      ],
      { timeout: 60_000, maxBuffer: 20 * 1024 * 1024 }
    ).toString();
  } catch (err) {
    // EXIT CODE 1 = VIOLATIONS TROUVÉES, PAS UNE ERREUR D'EXÉCUTION
    if (err.stdout) {
      raw = err.stdout.toString();
    } else {
      console.error('[ESLint] Erreur d\'exécution :', err.message);
      return [];
    }
  } finally {
    fs.unlinkSync(configPath);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[ESLint] Output JSON invalide');
    return [];
  }

  // NORMALISATION : FORMAT ESLINT → FORMAT STANDARD DES ANALYSEURS
  // Format ESLint : [{ filePath, messages: [{ ruleId, severity, message, line, endLine, source }] }]
  const vulns = [];

  for (const file of parsed) {
    for (const msg of file.messages) {
      if (!msg.ruleId) continue;

      vulns.push({
        tool:          'eslint',
        ruleId:        msg.ruleId,
        title:         formatTitle(msg.ruleId),
        description:   msg.message   || null,
        severity:      SEVERITY_MAP[msg.severity] || 'medium',
        filePath:      file.filePath  || null,
        lineStart:     msg.line       || null,
        lineEnd:       msg.endLine    || msg.line || null,
        codeSnippet:   msg.source     || null,
        fixSuggestion: null,
        cvssScore:     null,
        owaspCategory: null,
      });
    }
  }

  return vulns;
}

/**
 * Convertit un ruleId ESLint en titre lisible.
 * "security/detect-sql-injection" → "Detect Sql Injection"
 */
function formatTitle(ruleId) {
  if (!ruleId) return 'Vulnérabilité inconnue';
  const last = ruleId.includes('/') ? ruleId.split('/').at(-1) : ruleId;
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = { runEslint };
