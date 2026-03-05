// MAPPING STATIQUE RULE_ID → CATÉGORIE OWASP TOP 10 2025
// Priorité : 1. owaspCategory déjà dans le finding (Semgrep) 2. match regex 3. fallback A10

const RULE_MAP = [
  // A01:2025 — BROKEN ACCESS CONTROL
  // Accès non autorisé, IDOR, élévation de privilèges, manipulation d'URL + SSRF (intégré 2025)
  { pattern: /broken.access|idor|privilege|authz/i,         owaspId: 'A01:2025', owaspName: 'Broken Access Control' },
  { pattern: /detect-object-injection/i,                     owaspId: 'A01:2025', owaspName: 'Broken Access Control' },
  { pattern: /ssrf|server.side.request|open.redirect/i,     owaspId: 'A01:2025', owaspName: 'Broken Access Control' },

  // A02:2025 — SECURITY MISCONFIGURATION (monte de #5 à #2)
  // Headers manquants, config par défaut, stack traces, XXE, fonctionnalités inutiles
  { pattern: /cors.misconfiguration|cors.wildcard/i,         owaspId: 'A02:2025', owaspName: 'Security Misconfiguration' },
  { pattern: /security.misconfiguration|helmet|csp/i,        owaspId: 'A02:2025', owaspName: 'Security Misconfiguration' },
  { pattern: /debug.enabled|stack.trace.leak|x-powered-by/i, owaspId: 'A02:2025', owaspName: 'Security Misconfiguration' },
  { pattern: /xxe|xml.external|unsafe.xml/i,                 owaspId: 'A02:2025', owaspName: 'Security Misconfiguration' },

  // A03:2025 — SOFTWARE SUPPLY CHAIN FAILURES (NOUVEAU 2025)
  // Dépendances compromises, packages malveillants, CI/CD non sécurisé
  { pattern: /CVE-\d{4}/i,                                   owaspId: 'A03:2025', owaspName: 'Software Supply Chain Failures' },
  { pattern: /npm.audit|prototype.pollution|lodash/i,        owaspId: 'A03:2025', owaspName: 'Software Supply Chain Failures' },
  { pattern: /malicious.package|supply.chain|typosquat/i,    owaspId: 'A03:2025', owaspName: 'Software Supply Chain Failures' },

  // A04:2025 — CRYPTOGRAPHIC FAILURES (descend de #2 à #4)
  // Données sensibles en clair, algorithmes faibles, secrets, clés API
  { pattern: /aws|gcp|azure|cloud.key|api.key/i,             owaspId: 'A04:2025', owaspName: 'Cryptographic Failures' },
  { pattern: /private.key|secret|token|password.hard/i,      owaspId: 'A04:2025', owaspName: 'Cryptographic Failures' },
  { pattern: /github.token|gitlab|stripe|twilio/i,           owaspId: 'A04:2025', owaspName: 'Cryptographic Failures' },
  { pattern: /weak.crypto|md5|sha1.hash|des\b/i,             owaspId: 'A04:2025', owaspName: 'Cryptographic Failures' },
  { pattern: /cleartext|unencrypted|plain.text.pass/i,       owaspId: 'A04:2025', owaspName: 'Cryptographic Failures' },

  // A05:2025 — INJECTION (descend de #3 à #5)
  // SQL, NoSQL, OS command, eval + XSS inclus dans cette catégorie en 2025
  { pattern: /sqli|sql.inject|nosql/i,                       owaspId: 'A05:2025', owaspName: 'Injection' },
  { pattern: /detect-non-literal-regexp/i,                    owaspId: 'A05:2025', owaspName: 'Injection' },
  { pattern: /detect-eval|eval-with/i,                        owaspId: 'A05:2025', owaspName: 'Injection' },
  { pattern: /detect-child-process|command.inject/i,          owaspId: 'A05:2025', owaspName: 'Injection' },
  { pattern: /xss|cross.site|html.inject|mustache/i,          owaspId: 'A05:2025', owaspName: 'Injection' },
  { pattern: /template.inject|ssti/i,                         owaspId: 'A05:2025', owaspName: 'Injection' },
  { pattern: /path.travers|directory.travers|lfi|rfi/i,       owaspId: 'A05:2025', owaspName: 'Injection' },

  // A06:2025 — INSECURE DESIGN
  // Failles architecturales, absence de rate limiting, logique métier défaillante
  { pattern: /rate.limit|brute.force|no.limit/i,             owaspId: 'A06:2025', owaspName: 'Insecure Design' },
  { pattern: /insecure.design|threat.model|logic.flaw/i,     owaspId: 'A06:2025', owaspName: 'Insecure Design' },

  // A07:2025 — AUTHENTICATION FAILURES (renommé)
  // Brute force, sessions mal gérées, MFA absente, mots de passe faibles
  { pattern: /jwt|auth|session.fixation|broken.auth/i,        owaspId: 'A07:2025', owaspName: 'Authentication Failures' },
  { pattern: /hardcode.credential|default.password/i,         owaspId: 'A07:2025', owaspName: 'Authentication Failures' },
  { pattern: /weak.password|no.mfa|missing.mfa/i,             owaspId: 'A07:2025', owaspName: 'Authentication Failures' },

  // A08:2025 — SOFTWARE OR DATA INTEGRITY FAILURES
  // CI/CD non sécurisé, désérialisation non sûre, mises à jour sans signature
  { pattern: /deserializ|unsafe.deserializ|insecure.deserializ/i, owaspId: 'A08:2025', owaspName: 'Software or Data Integrity Failures' },
  { pattern: /integrity.check|unsigned.artifact|cicd/i,       owaspId: 'A08:2025', owaspName: 'Software or Data Integrity Failures' },

  // A09:2025 — SECURITY LOGGING & ALERTING FAILURES (renommé)
  // Pas de logs, pas d'alertes, pas de traçabilité
  { pattern: /log.injection|insufficient.log/i,               owaspId: 'A09:2025', owaspName: 'Security Logging & Alerting Failures' },
  { pattern: /no.logging|missing.log|audit.trail/i,           owaspId: 'A09:2025', owaspName: 'Security Logging & Alerting Failures' },

  // A10:2025 — MISHANDLING OF EXCEPTIONAL CONDITIONS (NOUVEAU 2025)
  // Mauvaise gestion des erreurs, fail open, fuite via messages d'erreur
  { pattern: /error.handling|exception.leak|fail.open/i,      owaspId: 'A10:2025', owaspName: 'Mishandling of Exceptional Conditions' },
  { pattern: /verbose.error|error.disclosure|stack.disclosure/i, owaspId: 'A10:2025', owaspName: 'Mishandling of Exceptional Conditions' },
];

// FALLBACK POUR LES RÈGLES NON RECONNUES
const FALLBACK = { owaspId: 'A10:2025', owaspName: 'Mishandling of Exceptional Conditions' };

/**
 * Mappe un ruleId ou une owaspCategory vers une catégorie OWASP 2025.
 *
 * @param {string|null} ruleId
 * @param {string|null} owaspCategory - catégorie déjà extraite (ex: "A07:2021" depuis Semgrep)
 * @returns {{ owaspId: string, owaspName: string }}
 */
function resolveOwasp(ruleId, owaspCategory) {
  // REMAPPING OWASP 2021 → 2025
  if (owaspCategory) {
    const remapped = OWASP_2021_TO_2025[owaspCategory.split(':')[0]];
    if (remapped) return remapped;
  }

  if (!ruleId) return FALLBACK;

  for (const { pattern, owaspId, owaspName } of RULE_MAP) {
    if (pattern.test(ruleId)) return { owaspId, owaspName };
  }

  return FALLBACK;
}

// REMAPPING OWASP 2021 → 2025 (les catégories ont changé de numéro et de nom)
const OWASP_2021_TO_2025 = {
  // A01:2021 Broken Access Control → A01:2025 Broken Access Control (inchangé)
  A01: { owaspId: 'A01:2025', owaspName: 'Broken Access Control' },
  // A02:2021 Cryptographic Failures → A04:2025 Cryptographic Failures (descend de #2 à #4)
  A02: { owaspId: 'A04:2025', owaspName: 'Cryptographic Failures' },
  // A03:2021 Injection → A05:2025 Injection (descend de #3 à #5)
  A03: { owaspId: 'A05:2025', owaspName: 'Injection' },
  // A04:2021 Insecure Design → A06:2025 Insecure Design
  A04: { owaspId: 'A06:2025', owaspName: 'Insecure Design' },
  // A05:2021 Security Misconfiguration → A02:2025 Security Misconfiguration (monte de #5 à #2)
  A05: { owaspId: 'A02:2025', owaspName: 'Security Misconfiguration' },
  // A06:2021 Vulnerable and Outdated Components → A03:2025 Software Supply Chain Failures (renommé/élargi)
  A06: { owaspId: 'A03:2025', owaspName: 'Software Supply Chain Failures' },
  // A07:2021 Identification and Authentication Failures → A07:2025 Authentication Failures (renommé)
  A07: { owaspId: 'A07:2025', owaspName: 'Authentication Failures' },
  // A08:2021 Software and Data Integrity Failures → A08:2025 Software or Data Integrity Failures
  A08: { owaspId: 'A08:2025', owaspName: 'Software or Data Integrity Failures' },
  // A09:2021 Security Logging and Monitoring Failures → A09:2025 Security Logging & Alerting Failures (renommé)
  A09: { owaspId: 'A09:2025', owaspName: 'Security Logging & Alerting Failures' },
  // A10:2021 Server-Side Request Forgery → A01:2025 Broken Access Control (SSRF intégré dans A01 en 2025)
  A10: { owaspId: 'A01:2025', owaspName: 'Broken Access Control' },
};

/**
 * Wrapping des findings bruts vers le format enrichi attendu par scanner.service.js et scan.model.js
 *
 * @param {Array<Object>} findings - Sorties normalisées de semgrep/eslint/npmAudit/trufflehog
 * @returns {Array<Object>} Findings wrappés avec owaspId, owaspName, description, suggestedFix, cvssScore
 */
function mapFindings(findings) {
  return findings.map((finding, index) => {
    const { owaspId, owaspName } = resolveOwasp(finding.ruleId, finding.owaspCategory);

    return {
      id:          `vuln-${String(index + 1).padStart(3, '0')}`,
      finding,
      owaspId,
      owaspName,
      description:   finding.description || null,
      codeSnippet:   finding.codeSnippet  || '',
      suggestedFix:  finding.fixSuggestion || '',
      cvssScore:     finding.cvssScore    || resolveCvss(finding.severity),
    };
  });
}

// CVSS PAR DÉFAUT BASÉ SUR LA SÉVÉRITÉ QUAND AUCUN SCORE N'EST FOURNI
const CVSS_DEFAULTS = new Map([['critical', 9.8], ['high', 7.5], ['medium', 5.0], ['low', 3.0]]);

function resolveCvss(severity) {
  return CVSS_DEFAULTS.get(severity) ?? 3.0;
}

module.exports = { mapFindings, resolveOwasp };
