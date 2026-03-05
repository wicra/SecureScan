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

  // Persister le langage détecté
  async updateLanguage(scanId, language) {
    return prisma.scan.update({
      where: { id: scanId },
      data: { language },
    });
  },

  // Mettre à jour avec les stats du scan
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
    const trunc = (s, n) => (s && typeof s === 'string') ? s.slice(0, n) : s;

    const data = vulnerabilities.map((vuln) => ({
      scanId,
      tool:          vuln.finding.tool,
      title:         trunc(vuln.finding.title || vuln.finding.message || 'Vulnérabilité inconnue', 500),
      description:   vuln.description || vuln.finding.description || null,
      severity:      vuln.finding.severity,
      owaspCategory: trunc(vuln.owaspId || null, 50),
      filePath:      trunc(vuln.finding.filePath || null, 1000),
      lineStart:     vuln.finding.lineStart || vuln.finding.line || null,
      lineEnd:       vuln.finding.lineEnd || null,
      ruleId:        trunc(vuln.finding.ruleId || null, 500),
      codeSnippet:   vuln.finding.codeSnippet || vuln.codeSnippet || null,
      fixSuggestion: vuln.finding.fixSuggestion || vuln.suggestedFix || null,
      cvssScore:     vuln.finding.cvssScore || vuln.cvssScore || null,
      isFixed: false,
    }));

    return prisma.vulnerability.createMany({ data });
  },

  // Marquer un scan comme échoué
  async markFailed(scanId) {
    return prisma.scan.update({
      where: { id: scanId },
      data: { status: "failed", completedAt: new Date() },
    });
  },

  // Récupérer un scan par ID avec ses vulnérabilités
  async findById(scanId) {
    return prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        vulnerabilities: {
          orderBy: [{ cvssScore: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  },

  // Récupérer le score uniquement (visiteurs non connectés)
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

  // Liste des scans d'un utilisateur
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

  // Supprimer un scan
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

  // Récupérer les vulnérabilités avec filtres
  // RÉCUPÉRER UNE VULNÉRABILITÉ PAR SON ID (utilisé par le controller AI on-demand)
  async findVulnById(vulnId) {
    return prisma.vulnerability.findUnique({ where: { id: vulnId } });
  },

  // METTRE À JOUR LE FIX SUGGESTION D'UNE VULNÉRABILITÉ (appel IA on-demand)
  async updateFixSuggestion(vulnId, fixSuggestion) {
    return prisma.vulnerability.update({
      where: { id: vulnId },
      data: { fixSuggestion },
    });
  },

  // Récupérer les vulnérabilités d'un scan avec filtres
  async getVulnerabilities(scanId, { severity, owasp } = {}) {
    const where = { scanId };
    if (severity) where.severity = severity;
    if (owasp) where.owaspCategory = owasp;
    return prisma.vulnerability.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  },

  // Rattacher un scan anonyme à un utilisateur
  async claimScan(scanId, userId) {
    return prisma.scan.update({
      where: { id: scanId },
      data: { userId },
    });
  },
};

module.exports = ScanModel;