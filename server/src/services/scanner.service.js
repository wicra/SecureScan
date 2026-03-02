const GitService = require("./git.service");

// ============================================================
// Les 4 services ci-dessous sont codés par Dev B.
// En attendant, on utilise des mocks qui retournent des données test.
// Quand Dev B push ses fichiers, on remplace les imports.
// ============================================================

// TODO: décommenter quand Dev B a codé les services
// const SemgrepService = require("./semgrep.service");
// const EslintService = require("./eslint.service");
// const NpmAuditService = require("./npmAudit.service");
// const TrufflehogService = require("./trufflehog.service");
// const OwaspService = require("./owasp.service");
// const ScoreService = require("./score.service");

// === MOCKS TEMPORAIRES (à supprimer après merge avec Dev B) ===
const MockSemgrepService = {
  async run(repoPath) {
    return [
      { ruleId: "javascript.express.security.audit.xss.serverfingerprintingaliases", filePath: "routes/api.js", line: 127, column: 5, severity: "critical", message: "User input in SQL query without parameterization", tool: "semgrep" },
      { ruleId: "javascript.express.security.audit.xss.mustache-escape", filePath: "frontend/app.js", line: 203, column: 12, severity: "high", message: "innerHTML with unsanitized user data", tool: "semgrep" },
      { ruleId: "javascript.express.security.cors-misconfiguration", filePath: "server.js", line: 15, column: 1, severity: "medium", message: "CORS configured with wildcard origin", tool: "semgrep" },
    ];
  },
};

const MockEslintService = {
  async run(repoPath) {
    return [
      { ruleId: "security/detect-eval-with-expression", filePath: "lib/utils.js", line: 45, column: 3, severity: "critical", message: "eval() called with user-controlled input", tool: "eslint" },
      { ruleId: "security/detect-child-process", filePath: "services/exec.js", line: 22, column: 5, severity: "high", message: "child_process.exec() with variable input", tool: "eslint" },
    ];
  },
};

const MockNpmAuditService = {
  async run(repoPath) {
    return [
      { ruleId: "CVE-2021-23337", filePath: "package.json", line: 0, column: 0, severity: "high", message: "lodash@4.17.20 — Prototype pollution in lodash", tool: "npm-audit" },
      { ruleId: "CVE-2022-46175", filePath: "package.json", line: 0, column: 0, severity: "high", message: "json5@1.0.1 — Prototype pollution", tool: "npm-audit" },
      { ruleId: "CVE-2023-26159", filePath: "package.json", line: 0, column: 0, severity: "medium", message: "follow-redirects@1.14.0 — URL redirection", tool: "npm-audit" },
    ];
  },
};

const MockTrufflehogService = {
  async run(repoPath) {
    return [
      { ruleId: "aws-access-key", filePath: "config/aws.js", line: 8, column: 1, severity: "critical", message: "AWS Access Key ID found in source code", tool: "trufflehog" },
      { ruleId: "github-token", filePath: ".env.prod", line: 3, column: 1, severity: "high", message: "GitHub Personal Access Token exposed", tool: "trufflehog" },
    ];
  },
};

const MockOwaspService = {
  mapFindings(findings) {
    const owaspMap = {
      // Injection (A05)
      "javascript.express.security.audit.xss.serverfingerprintingaliases": { owaspId: "A05:2025", owaspName: "Injection" },
      "javascript.express.security.audit.xss.mustache-escape": { owaspId: "A05:2025", owaspName: "Injection" },
      "security/detect-eval-with-expression": { owaspId: "A05:2025", owaspName: "Injection" },
      "security/detect-child-process": { owaspId: "A05:2025", owaspName: "Injection" },
      // Supply Chain (A03)
      "CVE-2021-23337": { owaspId: "A03:2025", owaspName: "Software Supply Chain Failures" },
      "CVE-2022-46175": { owaspId: "A03:2025", owaspName: "Software Supply Chain Failures" },
      "CVE-2023-26159": { owaspId: "A03:2025", owaspName: "Software Supply Chain Failures" },
      // Cryptographic Failures (A04)
      "aws-access-key": { owaspId: "A04:2025", owaspName: "Cryptographic Failures" },
      "github-token": { owaspId: "A04:2025", owaspName: "Cryptographic Failures" },
      // Security Misconfiguration (A02)
      "javascript.express.security.cors-misconfiguration": { owaspId: "A02:2025", owaspName: "Security Misconfiguration" },
    };

    return findings.map((finding, index) => {
      const mapping = owaspMap[finding.ruleId] || { owaspId: "A10:2025", owaspName: "Mishandling of Exceptional Conditions" };
      return {
        id: `vuln-${String(index + 1).padStart(3, "0")}`,
        finding,
        owaspId: mapping.owaspId,
        owaspName: mapping.owaspName,
        description: finding.message,
        codeSnippet: "",
        suggestedFix: "",
        cvssScore: finding.severity === "critical" ? 9.8 : finding.severity === "high" ? 7.5 : finding.severity === "medium" ? 5.0 : 3.0,
      };
    });
  },
};

const MockScoreService = {
  calculate(mappedVulns) {
    const weights = { critical: 15, high: 8, medium: 3, low: 1 };
    let penalty = 0;

    for (const vuln of mappedVulns) {
      penalty += weights[vuln.finding.severity] || 1;
    }

    return Math.max(0, Math.min(100, 100 - penalty));
  },

  categoryScores(mappedVulns) {
    const categories = {};

    for (const vuln of mappedVulns) {
      if (!categories[vuln.owaspId]) {
        categories[vuln.owaspId] = {
          owaspId: vuln.owaspId,
          name: vuln.owaspName,
          count: 0,
          maxSeverity: "low",
          findings: [],
        };
      }

      categories[vuln.owaspId].count++;
      categories[vuln.owaspId].findings.push(vuln);

      // Garde la sévérité la plus haute
      const order = ["low", "medium", "high", "critical"];
      if (order.indexOf(vuln.finding.severity) > order.indexOf(categories[vuln.owaspId].maxSeverity)) {
        categories[vuln.owaspId].maxSeverity = vuln.finding.severity;
      }
    }

    // Calcul du pourcentage pour les barres
    const maxCount = Math.max(...Object.values(categories).map((c) => c.count), 1);

    return Object.values(categories)
      .map((cat) => ({
        owaspId: cat.owaspId,
        name: cat.name,
        count: cat.count,
        maxSeverity: cat.maxSeverity,
        barPercent: Math.round((cat.count / maxCount) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  },
};

// ============================================================
// ORCHESTRATEUR
// ============================================================

const ScannerService = {
  /**
   * Exécute un scan complet sur un repo
   * @param {string} repoPath - chemin du repo cloné
   * @returns {object} - résultats complets du scan
   */
  async runFullScan(repoPath) {
    console.log("🔍 Lancement des 4 analyseurs en parallèle...");

    // Lance les 4 outils en parallèle
    // TODO: remplacer par les vrais services après merge Dev B
    const [semgrepResults, eslintResults, npmResults, truffleResults] =
      await Promise.all([
        MockSemgrepService.run(repoPath),
        MockEslintService.run(repoPath),
        MockNpmAuditService.run(repoPath),
        MockTrufflehogService.run(repoPath),
      ]);

    console.log(
      `📊 Résultats : Semgrep(${semgrepResults.length}) + ESLint(${eslintResults.length}) + npm(${npmResults.length}) + TruffleHog(${truffleResults.length})`
    );

    // Fusionner tous les findings
    const allFindings = [
      ...semgrepResults,
      ...eslintResults,
      ...npmResults,
      ...truffleResults,
    ];

    // Mapper sur OWASP
    const mappedVulns = MockOwaspService.mapFindings(allFindings);

    // Calculer les scores
    const score = MockScoreService.calculate(mappedVulns);
    const categories = MockScoreService.categoryScores(mappedVulns);

    // Compter par sévérité
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const vuln of mappedVulns) {
      severityCounts[vuln.finding.severity] =
        (severityCounts[vuln.finding.severity] || 0) + 1;
    }

    // Compter les secrets
    const secretsCount = truffleResults.length;

    // Compter les fichiers
    const filesTotal = GitService.countFiles(repoPath);

    return {
      score,
      grade: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F",
      totalVulnerabilities: mappedVulns.length,
      vulnCritical: severityCounts.critical,
      vulnHigh: severityCounts.high,
      vulnMedium: severityCounts.medium,
      vulnLow: severityCounts.low,
      secretsCount,
      filesTotal,
      categories,
      vulnerabilities: mappedVulns,
    };
  },
};

module.exports = ScannerService;