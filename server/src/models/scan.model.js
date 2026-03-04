const prisma = require("../config/db");

const ScanModel = {
  // Créer un scan (status: pending)
  async create({ userId, repoUrl, repoName, language, branch }) {
    return prisma.scan.create({
      data: {
        userId,
        repoUrl,
        repoName: repoName || null,
        language: language || null,
        branch: branch || "main",
        status: "pending",
      },
    });
  },

  // Mettre à jour le status → running
  async markRunning(scanId) {
    return prisma.scan.update({
      where: { id: scanId },
      data: { status: "running" },
    });
  },

  // Persister le langage détecté (appelé juste après la détection)
  async updateLanguage(scanId, language) {
    return prisma.scan.update({
      where: { id: scanId },
      data: { language },
    });
  },

  // Mettre à jour avec les stats du scan (sans les vulnérabilités)
  async updateStats(scanId, { score, vulnTotal, vulnCritical, vulnHigh, vulnMedium, vulnLow, secretsCount, filesTotal, filesImpacted }) {
    return prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "completed",
        score,
        vulnTotal,
        vulnCritical,
        vulnHigh,
        vulnMedium,
        vulnLow,
        secretsCount,
        filesTotal,
        filesImpacted: filesImpacted || 0,
        completedAt: new Date(),
      },
    });
  },

  // INSÉRER LES VULNÉRABILITÉS EN MASSE APRÈS LE SCAN
  // Supporte les deux formats : mocks Dev A (finding.message/line) ET services Dev B (finding.title/lineStart)
  async insertVulnerabilities(scanId, vulnerabilities) {
    // Helpers de troncature défensive (sécurité si la DB a des limites strictes)
    const trunc  = (s, n) => (s && typeof s === 'string') ? s.slice(0, n) : s;

    const data = vulnerabilities.map((vuln) => ({
      scanId,
      tool:          vuln.finding.tool,
      title:         trunc(vuln.finding.title         || vuln.finding.message      || 'Vulnérabilité inconnue', 500),
      description:   vuln.description           || vuln.finding.description  || null,  // @db.Text → pas de limite
      severity:      vuln.finding.severity,
      owaspCategory: trunc(vuln.owaspId               || null, 50),
      filePath:      trunc(vuln.finding.filePath      || null, 1000),
      lineStart:     vuln.finding.lineStart     || vuln.finding.line         || null,
      lineEnd:       vuln.finding.lineEnd       || null,
      ruleId:        trunc(vuln.finding.ruleId        || null, 500),
      codeSnippet:   vuln.finding.codeSnippet   || vuln.codeSnippet          || null,
      fixSuggestion: vuln.finding.fixSuggestion || vuln.suggestedFix         || null,
      cvssScore:     vuln.finding.cvssScore     || vuln.cvssScore            || null,
      isFixed: false,
    }));

    return prisma.vulnerability.createMany({ data });
  },

  // Marquer un scan comme échoué
  async markFailed(scanId) {
    return prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "failed",
        completedAt: new Date(),
      },
    });
  },

  // Récupérer un scan par ID avec ses vulnérabilités
  async findById(scanId) {
    return prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        vulnerabilities: {
          // TRI : cvssScore desc place les critiques en premier de façon fiable
          // orderBy severity "asc" est alphabétique : "low" < "medium" → ordre cassé
          orderBy: [{ cvssScore: 'desc' }, { createdAt: 'asc' }],
        },
        reports: true,
      },
    });
  },

  // Récupérer le score uniquement (pour les visiteurs non connectés)
  async findScoreOnly(scanId) {
    return prisma.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        repoUrl: true,
        repoName: true,
        status: true,
        score: true,
        vulnTotal: true,
        vulnCritical: true,
        vulnHigh: true,
        vulnMedium: true,
        vulnLow: true,
        createdAt: true,
      },
    });
  },

  // Liste des scans d'un utilisateur (pour l'historique)
  async findByUserId(userId) {
    return prisma.scan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        repoUrl: true,
        repoName: true,
        language: true,
        branch: true,
        status: true,
        score: true,
        vulnTotal: true,
        vulnCritical: true,
        vulnHigh: true,
        vulnMedium: true,
        vulnLow: true,
        secretsCount: true,
        filesTotal: true,
        isFavorite: true,
        createdAt: true,
        completedAt: true,
      },
    });
  },

  // Toggle favori
  async toggleFavorite(scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return null;

    return prisma.scan.update({
      where: { id: scanId },
      data: { isFavorite: !scan.isFavorite },
    });
  },

  // Supprimer un scan (cascade supprime les vulnérabilités et reports)
  async delete(scanId) {
    return prisma.scan.delete({ where: { id: scanId } });
  },

  // Marquer une vulnérabilité comme fixée
  async markVulnFixed(vulnId) {
    return prisma.vulnerability.update({
      where: { id: vulnId },
      data: { isFixed: true },
    });
  },

  // Récupérer les vulnérabilités d'un scan avec filtres
  async getVulnerabilities(scanId, { severity, owasp } = {}) {
    const where = { scanId };

    if (severity) {
      where.severity = severity;
    }
    if (owasp) {
      where.owaspCategory = owasp;
    }

    return prisma.vulnerability.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },
};

module.exports = ScanModel;