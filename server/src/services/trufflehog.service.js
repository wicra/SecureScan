
// IMPORTS DES MODULES DE BASE (GESTION DES CHEMINS, ENV ET PROCESSUS)
const path = require('path');
const { toolsEnv }   = require('../config/tools');
const { spawnAsync } = require('../utils/spawn');


// LISTE DES DÉTECTEURS CONSIDÉRÉS COMME CRITIQUES
const CRITICAL_DETECTORS = new Set([
  'AWS', 'GCP', 'Azure', 'GitHub', 'GitLab', 'Stripe',
  'Twilio', 'SendGrid', 'Slack', 'PrivateKey',
]);


// DÉTERMINE LA SÉVÉRITÉ EN FONCTION DU TYPE DE SECRET ET DE SA VALIDITÉ
function resolveSeverity(verified, detectorName) {
  if (verified) return 'critical';
  if (CRITICAL_DETECTORS.has(detectorName)) return 'high';
  return 'medium';
}


// FONCTION PRINCIPALE : LANCE L'ANALYSE TRUFFLEHOG SUR LE REPO
async function runTrufflehog(repoPath) {
  // RÉCUPÈRE LE CHEMIN ABSOLU DU REPO À ANALYSER
  const absPath = path.resolve(repoPath);
  let result;
  try {
    // LANCE TRUFFLEHOG EN LIGNE DE COMMANDE AVEC LES BONS PARAMÈTRES
    result = await spawnAsync(
      'trufflehog',
      ['filesystem', absPath, '--json', '--no-update'],
      { timeout: 120_000, env: toolsEnv(), shell: true }
    );
  } catch (err) {
    // EN CAS D'ERREUR, LOG ET RETOURNE UN TABLEAU VIDE
    console.error('[TruffleHog] Erreur:', err.message);
    return [];
  }
  // PARSE LA SORTIE NDJSON DE TRUFFLEHOG (UNE LIGNE = UN OBJET JSON)
  const raw = result.stdout || '';
  if (!raw.trim()) return [];
  return raw.split('\n').filter(Boolean).reduce((acc, line) => {
    let finding;
    try { finding = JSON.parse(line); } catch { return acc; }
    const detector = finding.DetectorName || 'Unknown';
    const verified  = finding.Verified === true;
    const meta = finding.SourceMetadata?.Data ?? {};
    const src  = meta.Filesystem ?? meta.Git ?? {};
    acc.push({
      tool:          'trufflehog',
      ruleId:        detector,
      title:         `Secret detecte : ${detector}`,
      description:   buildDescription(finding, verified),
      severity:      resolveSeverity(verified, detector),
      filePath:      src.file   || null,
      lineStart:     src.line   || null,
      lineEnd:       src.line   || null,
      codeSnippet:   finding.Redacted || null,
      fixSuggestion: 'Revoquer immediatement le secret, le retirer de l historique Git, puis le remplacer.',
      cvssScore:     verified ? 9.8 : null,
      owaspCategory: 'A07:2021',
    });
    return acc;
  }, []);
}


// CONSTRUIT UNE DESCRIPTION LISIBLE POUR CHAQUE SECRET DÉTECTÉ
function buildDescription(finding, verified) {
  const parts = [`Detecteur : ${finding.DetectorName || '?'}`];
  if (verified)               parts.push('Secret verifie comme actif');
  if (finding.DecoderName)    parts.push(`Encodage : ${finding.DecoderName}`);
  if (finding.SourceMetadata?.Data?.Git?.commit) {
    parts.push(`Commit : ${finding.SourceMetadata.Data.Git.commit.slice(0, 8)}`);
  }
  return parts.join(' -- ');
}


// EXPORT DU MODULE POUR UTILISATION DANS LE BACKEND
module.exports = { runTrufflehog, run: runTrufflehog };
