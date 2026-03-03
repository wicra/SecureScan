const GitService      = require('./git.service');
const SemgrepService  = require('./semgrep.service');
const EslintService   = require('./eslint.service');
const NpmAuditService = require('./npmAudit.service');
const TrufflehogService = require('./trufflehog.service');
const OwaspService    = require('./owasp.service');
const ScoreService    = require('./score.service');

// ORCHESTRATEUR — LANCE LES 4 ANALYSEURS EN PARALLÈLE ET AGRÈGE LES RÉSULTATS

const ScannerService = {
  /**
   * Exécute un scan complet sur un repo
   * @param {string} repoPath - chemin du repo cloné
   * @returns {object} - résultats complets du scan
   */
  async runFullScan(repoPath) {
    const t0 = Date.now();
    const elapsed = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;

    console.log('\n┌─────────────────────────────────────┐');
    console.log('│  🔍  SCAN EN COURS                        │');
    console.log('└─────────────────────────────────────┘');
    console.log('🔄 Lancement des 4 analyseurs en parallèle...');

    // LANCE LES 4 ANALYSEURS EN PARALLÈLE avec logs individuels
    const withLog = (name, emoji, promise) => {
      const ts = Date.now();
      console.log(`  ${emoji} [${name}] démarré`);
      return promise
        .then((r) => { console.log(`  ✅ [${name}] terminé — ${r.length} résultats  (${((Date.now()-ts)/1000).toFixed(1)}s)`); return r; })
        .catch((err) => { console.error(`  ❌ [${name}] échec: ${err.message}`); return []; });
    };

    const [semgrepResults, eslintResults, npmResults, truffleResults] =
      await Promise.all([
        withLog('Semgrep',    '🧬', SemgrepService.run(repoPath)),
        withLog('ESLint',     '📋', EslintService.run(repoPath)),
        withLog('npm audit',  '📦', NpmAuditService.run(repoPath)),
        withLog('TruffleHog', '🔑', TrufflehogService.run(repoPath)),
      ]);

    const total = semgrepResults.length + eslintResults.length + npmResults.length + truffleResults.length;
    console.log(`\n📊 Résultats bruts : Semgrep(${semgrepResults.length}) + ESLint(${eslintResults.length}) + npm(${npmResults.length}) + TruffleHog(${truffleResults.length}) = ${total} ${elapsed()}`);

    const allFindings = [
      ...semgrepResults,
      ...eslintResults,
      ...npmResults,
      ...truffleResults,
    ];

    console.log('🗺️  Mapping OWASP...');
    const mappedVulns = OwaspService.mapFindings(allFindings);

    console.log('🗂️  Calcul du score...');
    const score      = ScoreService.calculate(mappedVulns);
    const categories = ScoreService.categoryScores(mappedVulns);
    const filesImpacted = ScoreService.countImpactedFiles(mappedVulns);

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const vuln of mappedVulns) {
      severityCounts[vuln.finding.severity] = (severityCounts[vuln.finding.severity] || 0) + 1;
    }

    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';
    const secretsCount = truffleResults.length;
    const filesTotal   = GitService.countFiles(repoPath);

    console.log(`\n┌─ RÉSULTAT ─────────────────────────────┐`);
    console.log(`│  Score    : ${score}/100  (grade ${grade})`);
    console.log(`│  Vuln     : ${mappedVulns.length} total  (🔴 ${severityCounts.critical}  🟠 ${severityCounts.high}  🟡 ${severityCounts.medium}  🔵 ${severityCounts.low})`);
    console.log(`│  Secrets  : ${secretsCount}  |  Fichiers : ${filesImpacted}/${filesTotal} impactés`);
    console.log(`│  Durée    : ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(`└──────────────────────────────────┘`);

    return {
      score,
      grade,
      totalVulnerabilities: mappedVulns.length,
      vulnCritical: severityCounts.critical,
      vulnHigh:     severityCounts.high,
      vulnMedium:   severityCounts.medium,
      vulnLow:      severityCounts.low,
      secretsCount,
      filesTotal,
      filesImpacted,
      categories,
      vulnerabilities: mappedVulns,
    };
  },
};

module.exports = ScannerService;