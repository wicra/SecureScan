
// IMPORTS DES MODULES DE BASE (GESTION DES CHEMINS, ENV ET PROCESSUS)
const path = require('path');
const { toolsEnv }   = require('../config/tools');
const { spawnAsync } = require('../utils/spawn');


// TABLE DE CORRESPONDANCE ENTRE LES NIVEAUX SEMGREP ET SECURESCAN
const SEVERITY_MAP = {
  ERROR:   'critical',
  WARNING: 'high',
  INFO:    'medium',
  NOTE:    'low',
  HINT:    'low',
};


// FONCTION PRINCIPALE : LANCE L'ANALYSE SEMGREP SUR LE REPO
/**
 * Exécute Semgrep sur un repo local et retourne les vulnérabilités normalisées.
 * Async — ne bloque PAS la boucle d’événements Node.js.
 *
 * @param {string} repoPath - Chemin absolu du repo cloné
 * @returns {Promise<Array<Object>>} Vulnérabilités au format standard
 */
async function runSemgrep(repoPath) {
  // RÉCUPÈRE LE CHEMIN ABSOLU DU REPO À ANALYSER
  const absPath = path.resolve(repoPath);

  let result;
  try {
    // LANCE SEMGREP EN LIGNE DE COMMANDE AVEC LES BONS PARAMÈTRES
    result = await spawnAsync(
      'semgrep',
      ['--config', 'auto', absPath, '--json', '--quiet'],
      { timeout: 180_000, env: toolsEnv(), shell: true }
    );
  } catch (err) {
    // EN CAS D'ERREUR, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[Semgrep] Erreur d\'exécution :', err.message);
    return [];
  }

  // PARSE LA SORTIE JSON DE SEMGREP
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    // SI LE JSON EST INVALIDE, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[Semgrep] Output JSON invalide — code:', result.code);
    console.error('[Semgrep] stderr (300):', result.stderr.slice(0, 300));
    return [];
  }

  // TRANSFORME LES RÉSULTATS EN FORMAT VULNÉRABILITÉ STANDARD
  return (parsed.results || []).map((r) => {
    const extra    = r.extra    || {};
    const metadata = extra.metadata || {};
    const owaspRaw      = metadata.owasp?.[0] || '';
    const owaspCategory = owaspRaw ? owaspRaw.split(' ')[0] : null;

    return {
      tool:          'semgrep',
      ruleId:        r.check_id         || null,
      title:         formatTitle(r.check_id),
      description:   extra.message      || null,
      severity:      SEVERITY_MAP[extra.severity?.toUpperCase()] || 'medium',
      filePath:      r.path             || null,
      lineStart:     r.start?.line      || null,
      lineEnd:       r.end?.line        || null,
      codeSnippet:   extra.lines        || null,
      fixSuggestion: extra.fix          || null,
      cvssScore:     metadata.cvss      || null,
      owaspCategory,
    };
  });
}


// FORMATTE UN IDENTIFIANT DE RÈGLE EN TITRE LISIBLE
function formatTitle(checkId) {
  if (!checkId) return 'Vulnérabilité inconnue';
  const last = checkId.split('.').at(-1);
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}


// EXPORT DU MODULE POUR UTILISATION DANS LE BACKEND
module.exports = { runSemgrep, run: runSemgrep };
