const { execFileSync } = require('child_process');
const path = require('path');

// CORRESPONDANCE SÉVÉRITÉ NPM AUDIT → FORMAT INTERNE
const SEVERITY_MAP = {
  critical: 'critical',
  high:     'high',
  moderate: 'medium',
  low:      'low',
  info:     'low',
};

/**
 * Exécute `npm audit` sur un repo local et retourne les vulnérabilités normalisées.
 * Cible uniquement les dépendances — pas de filePath, pas de lineStart.
 *
 * @param {string} repoPath - Chemin absolu du repo cloné
 * @returns {Array<Object>} Vulnérabilités au format standard
 */
function runNpmAudit(repoPath) {
  const absPath = path.resolve(repoPath);

  let raw;
  try {
    raw = execFileSync(
      'npm',
      ['audit', '--json'],
      { cwd: absPath, timeout: 60_000, maxBuffer: 20 * 1024 * 1024 }
    ).toString();
  } catch (err) {
    // EXIT CODE 1 = VULNÉRABILITÉS TROUVÉES, PAS UNE ERREUR D'EXÉCUTION
    if (err.stdout) {
      raw = err.stdout.toString();
    } else {
      console.error('[NpmAudit] Erreur d\'exécution :', err.message);
      return [];
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[NpmAudit] Output JSON invalide');
    return [];
  }

  // NORMALISATION : FORMAT NPM AUDIT v2 → FORMAT STANDARD DES ANALYSEURS
  // Format : { vulnerabilities: { [pkgName]: { severity, via, fixAvailable, range, ... } } }
  const vulns = [];
  const entries = parsed.vulnerabilities || {};

  for (const [pkgName, vuln] of Object.entries(entries)) {
    // "via" peut contenir des strings (dépendance transitive) ou des objets (CVE direct)
    // On ne traite que les objets — les strings sont des refs vers d'autres entrées déjà traitées
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

// CONSTRUCTION DES CHAMPS DÉRIVÉS

function buildDescription(pkgName, vuln, source) {
  const parts = [`Package: ${pkgName}@${vuln.range || '*'}`];
  if (source.cve)  parts.push(`CVE: ${source.cve}`);
  if (source.cwe)  parts.push(`CWE: ${source.cwe}`);
  return parts.join(' — ');
}

function buildFix(fixAvailable) {
  if (!fixAvailable) return 'Aucun correctif disponible.';
  if (fixAvailable === true) return 'Mettre à jour vers la dernière version (`npm audit fix`).';
  if (typeof fixAvailable === 'object') {
    return `Mettre à jour ${fixAvailable.name} vers la version ${fixAvailable.version}${fixAvailable.isSemVerMajor ? ' (breaking change)' : ''}.`;
  }
  return null;
}

module.exports = { runNpmAudit };
