
// IMPORTS DES MODULES DE BASE (GESTION DES CHEMINS, FICHIERS, ENV ET PROCESSUS)
const path = require('path');
const fs   = require('fs');
const { toolsEnv }   = require('../config/tools');
const { spawnAsync } = require('../utils/spawn');


// TABLE DE CORRESPONDANCE ENTRE LES NIVEAUX NPM AUDIT ET SECURESCAN
const SEVERITY_MAP = {
  critical: 'critical',
  high:     'high',
  moderate: 'medium',
  low:      'low',
  info:     'low',
};


// FONCTION PRINCIPALE : LANCE L'ANALYSE NPM AUDIT SUR LE REPO
/**
 * Exécute `npm audit` sur un repo local.
 * Async — ne bloque PAS la boucle d’événements Node.js.
 */
async function runNpmAudit(repoPath) {
  // RÉCUPÈRE LE CHEMIN ABSOLU DU REPO À ANALYSER
  const absPath = path.resolve(repoPath);

  // SI PAS DE PACKAGE-LOCK.JSON → EN GÉNÉRER UN SANS INSTALLER (PLUS RAPIDE)
  const lockFile = path.join(absPath, 'package-lock.json');
  if (!fs.existsSync(lockFile) && fs.existsSync(path.join(absPath, 'package.json'))) {
    try {
      await spawnAsync(
        'npm',
        ['install', '--package-lock-only', '--ignore-scripts', '--legacy-peer-deps'],
        { timeout: 120_000, env: toolsEnv(), cwd: absPath, shell: true }
      );
    } catch { /* on tente quand même npm audit */ }
  }

  let result;
  try {
    // LANCE NPM AUDIT EN LIGNE DE COMMANDE AVEC LES BONS PARAMÈTRES
    result = await spawnAsync(
      'npm',
      ['audit', '--json', '--omit=optional'],
      { timeout: 180_000, env: toolsEnv(), cwd: absPath, shell: true }
    );
  } catch (err) {
    // EN CAS D'ERREUR, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[NpmAudit] Erreur:', err.message);
    return [];
  }

  // PARSE LA SORTIE JSON DE NPM AUDIT
  // EXIT CODE 1 = VULNÉRABILITÉS TROUVÉES — STDOUT CONTIENT QUAND MÊME LE JSON
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    // SI LE JSON EST INVALIDE, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[NpmAudit] Output JSON invalide — code:', result.code);
    return [];
  }

  // TRANSFORME LES RÉSULTATS EN FORMAT VULNÉRABILITÉ STANDARD
  const vulns   = [];
  const entries = parsed.vulnerabilities || {};

  for (const [pkgName, vuln] of Object.entries(entries)) {
    const directSources = Array.isArray(vuln.via)
      ? vuln.via.filter((v) => typeof v === 'object')
      : [];
    if (directSources.length === 0) continue;

    for (const source of directSources) {
      vulns.push({
        tool:          'npm-audit',
        ruleId:        source.url      || source.cve    || null,
        title:         source.title    || `Vulnérabilité dans ${pkgName}`,
        description:   buildDescription(pkgName, vuln, source),
        severity:      SEVERITY_MAP[vuln.severity] || 'medium',
        filePath:      null,
        lineStart:     null,
        lineEnd:       null,
        codeSnippet:   null,
        fixSuggestion: buildFix(vuln.fixAvailable),
        cvssScore:     source.cvss?.score ?? null,
        owaspCategory: null,
      });
    }
  }
  return vulns;
}


// CONSTRUIT UNE DESCRIPTION LISIBLE POUR CHAQUE VULNÉRABILITÉ
function buildDescription(pkgName, vuln, source) {
  const parts = [`Package: ${pkgName}@${vuln.range || '*'}`];
  if (source.cve)  parts.push(`CVE: ${source.cve}`);
  if (source.cwe)  parts.push(`CWE: ${source.cwe}`);
  return parts.join(' — ');
}


// GÉNÈRE UN MESSAGE DE CORRECTION ADAPTÉ SELON LE TYPE DE FIX
function buildFix(fixAvailable) {
  if (!fixAvailable) return 'Aucun correctif disponible.';
  if (fixAvailable === true) return 'Mettre à jour vers la dernière version (`npm audit fix`).';
  if (typeof fixAvailable === 'object') {
    return `Mettre à jour ${fixAvailable.name} vers la version ${fixAvailable.version}${fixAvailable.isSemVerMajor ? ' (breaking change)' : ''}.`;
  }
  return null;
}


// EXPORT DU MODULE POUR UTILISATION DANS LE BACKEND
module.exports = { runNpmAudit, run: runNpmAudit };
