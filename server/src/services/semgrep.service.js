const { execSync } = require('child_process');
const path = require('path');

// CORRESPONDANCE SÉVÉRITÉ SEMGREP → FORMAT INTERNE
const SEVERITY_MAP = {
  ERROR:   'critical',
  WARNING: 'high',
  INFO:    'medium',
  NOTE:    'low',
  HINT:    'low',
};

/**
 * Exécute Semgrep sur un repo local et retourne les vulnérabilités normalisées.
 *
 * @param {string} repoPath - Chemin absolu du repo cloné
 * @returns {Array<Object>} Vulnérabilités au format standard
 */
function runSemgrep(repoPath) {
  const absPath = path.resolve(repoPath);

  let raw;
  try {
    raw = execSync(
      `semgrep --config auto "${absPath}" --json --quiet`,
      { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 }
    ).toString();
  } catch (err) {
    // EXIT CODE 1 = VULNÉRABILITÉS TROUVÉES, PAS UNE ERREUR D'EXÉCUTION
    if (err.stdout) {
      raw = err.stdout.toString();
    } else {
      console.error('[Semgrep] Erreur d\'exécution :', err.message);
      return [];
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[Semgrep] Output JSON invalide');
    return [];
  }

  // NORMALISATION VERS LE FORMAT STANDARD DES ANALYSEURS
  return (parsed.results || []).map((r) => {
    const extra    = r.extra    || {};
    const metadata = extra.metadata || {};

    // OWASP : "A07:2021 - Injection" → on ne garde que le code "A07:2021"
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

/**
 * Convertit un check_id Semgrep en titre lisible.
 * "javascript.express.security.audit.sqli" → "Sqli"
 */
function formatTitle(checkId) {
  if (!checkId) return 'Vulnérabilité inconnue';
  const last = checkId.split('.').at(-1);
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

module.exports = { runSemgrep };
