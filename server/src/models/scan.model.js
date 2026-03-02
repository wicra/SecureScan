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

  // Insérer les vulnérabilités en masse après le scan
  async insertVulnerabilities(scanId, vulnerabilities) {
    const data = vulnerabilities.map((vuln) => ({
      scanId,
      tool: vuln.finding.tool,
      title: vuln.finding.message,
      description: vuln.description || null,
      severity: vuln.finding.severity,
      owaspCategory: vuln.owaspId || null,
      filePath: vuln.finding.filePath || null,
      lineStart: vuln.finding.line || null,
      lineEnd: null,
      ruleId: vuln.finding.ruleId || null,
      codeSnippet: vuln.codeSnippet || null,
      fixSuggestion: vuln.suggestedFix || null,
      cvssScore: vuln.cvssScore || null,
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
          orderBy: [
            { severity: "asc" }, // critical en premier (alphabétique : c < h < l < m)
          ],
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