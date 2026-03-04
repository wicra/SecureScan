// TABLES DE PÉNALITÉ ET PLAFOND PAR SÉVÉRITÉ (POUR LE SCORE FINAL)
// Plafond = contribution max par catégorie (total max = 100)
const PENALTY_PER_VULN = { critical: 20,  high: 10,  medium: 2,   low: 0.5  };
const PENALTY_CAP      = { critical: 40,  high: 40,  medium: 15,  low: 5    };
 
// ORDRE DES SÉVÉRITÉS POUR COMPARAISON
const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];
 
 
// CALCULE LE SCORE GLOBAL DE SÉCURITÉ (0 = COMPROMIS, 100 = PROPRE)
// FORMULE PLAFONNÉE : CHAQUE SÉVÉRITÉ CONTRIBUE AU PLUS X POINTS DE PÉNALITÉ
function calculate(mappedVulns) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const v of mappedVulns) {
    counts[v.finding.severity] = (counts[v.finding.severity] || 0) + 1;
  }
 
  const penalty = Object.keys(PENALTY_PER_VULN).reduce((sum, sev) => {
    const raw    = counts[sev] * PENALTY_PER_VULN[sev];
    const capped = Math.min(raw, PENALTY_CAP[sev]);
    return sum + capped;
  }, 0);
 
  return Math.max(0, Math.round(100 - penalty));
}
 
 
// CALCULE LES SCORES PAR CATÉGORIE OWASP (POUR LES BARRES DU RAPPORT)
function categoryScores(mappedVulns) {
  const categories = {};
 
  for (const vuln of mappedVulns) {
    if (!categories[vuln.owaspId]) {
      categories[vuln.owaspId] = {
        owaspId:     vuln.owaspId,
        name:        vuln.owaspName,
        count:       0,
        maxSeverity: 'low',
      };
    }
 
    const cat = categories[vuln.owaspId];
    cat.count++;
 
    // GARDE LA SÉVÉRITÉ LA PLUS HAUTE DE LA CATÉGORIE
    if (SEVERITY_ORDER.indexOf(vuln.finding.severity) > SEVERITY_ORDER.indexOf(cat.maxSeverity)) {
      cat.maxSeverity = vuln.finding.severity;
    }
  }
 
  const maxCount = Math.max(...Object.values(categories).map((c) => c.count), 1);
 
  return Object.values(categories)
    .map((cat) => ({
      ...cat,
      barPercent: Math.round((cat.count / maxCount) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
 
 
// CALCULE LE NOMBRE DE FICHIERS UNIQUES IMPACTÉS PAR LES VULNÉRABILITÉS
function countImpactedFiles(mappedVulns) {
  return new Set(
    mappedVulns
      .map((v) => v.finding.filePath)
      .filter(Boolean)
  ).size;
}
 
 
// EXPORT DU MODULE POUR UTILISATION DANS LE BACKEND
module.exports = { calculate, categoryScores, countImpactedFiles };