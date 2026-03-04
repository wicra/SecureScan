
// IMPORTS DES MODULES DE BASE (GESTION DES CHEMINS, FICHIERS, ENV ET PROCESSUS)
const path = require('path');
const fs   = require('fs');
const { toolsEnv }   = require('../config/tools');
const { spawnAsync } = require('../utils/spawn');


// TABLE DE CORRESPONDANCE ENTRE LES NIVEAUX ESLINT ET SECURESCAN
const SEVERITY_MAP = { 2: 'high', 1: 'medium', 0: 'low' };


// CONFIGURATION TEMPORAIRE ESLINT POUR FORCER LES RÈGLES DE SÉCURITÉ
const ESLINT_CONFIG = {
  env:     { browser: true, node: true, es2021: true },
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules:   {},
};


// FONCTION PRINCIPALE : LANCE L'ANALYSE ESLINT SUR LE REPO
async function runEslint(repoPath) {
  // RÉCUPÈRE LES CHEMINS ABSOLUS NÉCESSAIRES
  const absPath    = path.resolve(repoPath);
  const configPath = path.join(absPath, '.eslint-securescan.json');
  const eslintBin  = path.join(__dirname, '..', '..', 'node_modules', '.bin', 'eslint');
  const serverDir  = path.join(__dirname, '..', '..');

  // CRÉE LE FICHIER DE CONFIG TEMPORAIRE DANS LE REPO
  fs.writeFileSync(configPath, JSON.stringify(ESLINT_CONFIG, null, 2));

  let result;
  try {
    // LANCE ESLINT EN LIGNE DE COMMANDE AVEC LES BONS PARAMÈTRES
    result = await spawnAsync(
      eslintBin,
      [
        '--config', configPath,
        '--format', 'json',
        '--ext', '.js,.ts,.jsx,.tsx',
        '--no-eslintrc',
        '--resolve-plugins-relative-to', serverDir,
        absPath,
      ],
      { timeout: 120_000, env: toolsEnv(), shell: true }
    );
  } catch (err) {
    // EN CAS D'ERREUR, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[ESLint] Erreur:', err.message);
    return [];
  } finally {
    // SUPPRIME LE FICHIER DE CONFIG TEMPORAIRE APRÈS ANALYSE
    try { fs.unlinkSync(configPath); } catch {}
  }

  // PARSE LA SORTIE JSON D'ESLINT
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    // SI LE JSON EST INVALIDE, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[ESLint] Output JSON invalide -- code:', result.code);
    console.error('[ESLint] stderr (200):', result.stderr.slice(0, 200));
    return [];
  }

  // TRANSFORME LES RÉSULTATS EN FORMAT VULNÉRABILITÉ STANDARD
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
        filePath:      file.filePath || null,
        lineStart:     msg.line      || null,
        lineEnd:       msg.endLine   || msg.line || null,
        codeSnippet:   msg.source    || null,
        fixSuggestion: null,
        cvssScore:     null,
        owaspCategory: null,
      });
    }
  }
  return vulns;
}


// FORMATTE UN IDENTIFIANT DE RÈGLE EN TITRE LISIBLE
function formatTitle(ruleId) {
  if (!ruleId) return 'Vulnerabilite inconnue';
  const last = ruleId.includes('/') ? ruleId.split('/').at(-1) : ruleId;
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}


// EXPORT DU MODULE POUR UTILISATION DANS LE BACKEND
module.exports = { runEslint, run: runEslint };