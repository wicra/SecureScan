const ScanModel = require("../models/scan.model");
const GitService = require("../services/git.service");
const ScannerService = require("../services/scanner.service");

// POST /api/scans — Lancer un nouveau scan
const createScan = async (req, res, next) => {
  let repoPath = null;
  let scan = null;

  try {
    const { repoUrl } = req.body;
    const repoName = GitService.extractRepoName(repoUrl);

    scan = await ScanModel.create({
      userId: req.user ? req.user.id : null,
      repoUrl,
      repoName,
    });

    console.log(`🚀 Scan #${scan.id} lancé pour ${repoName}`);
    await ScanModel.markRunning(scan.id);

    repoPath = await GitService.cloneRepo(repoUrl);

    const language = GitService.detectLanguage(repoPath);
    if (language) {
      await ScanModel.updateLanguage(scan.id, language);
    }

    const results = await ScannerService.runFullScan(repoPath);

    await ScanModel.updateStats(scan.id, {
      score: results.score,
      vulnTotal: results.totalVulnerabilities,
      vulnCritical: results.vulnCritical,
      vulnHigh: results.vulnHigh,
      vulnMedium: results.vulnMedium,
      vulnLow: results.vulnLow,
      secretsCount: results.secretsCount,
      filesTotal: results.filesTotal,
      filesImpacted: results.filesImpacted || 0,
    });

    if (results.vulnerabilities.length > 0) {
      await ScanModel.insertVulnerabilities(scan.id, results.vulnerabilities);
    }

    GitService.cleanup(repoPath);

    console.log(`✅ Scan #${scan.id} terminé — Score: ${results.score}/100 — ${results.totalVulnerabilities} vulns`);

    if (!req.user) {
      return res.status(201).json({
        scanId: scan.id,
        repoName,
        score: results.score,
        grade: results.grade,
        totalVulnerabilities: results.totalVulnerabilities,
        vulnCritical: results.vulnCritical,
        vulnHigh: results.vulnHigh,
        vulnMedium: results.vulnMedium,
        vulnLow: results.vulnLow,
        secretsCount: results.secretsCount,
        filesTotal: results.filesTotal,
        filesImpacted: results.filesImpacted || 0,
        message: "Connectez-vous pour voir le détail des vulnérabilités.",
      });
    }

    res.status(201).json({
      scanId: scan.id,
      repoName,
      language,
      ...results,
    });
  } catch (err) {
    if (repoPath) GitService.cleanup(repoPath);
    if (scan?.id) {
      await ScanModel.markFailed(scan.id).catch(() => {});
    }
    console.error(`❌ Scan échoué :`, err.message);
    next(err);
  }
};

// GET /api/scans/:id — Détail d'un scan
const getScan = async (req, res, next) => {
  try {
    const scanId = parseInt(req.params.id);
    if (isNaN(scanId)) {
      return res.status(400).json({ error: "ID de scan invalide." });
    }

    if (!req.user) {
      const scan = await ScanModel.findScoreOnly(scanId);
      if (!scan) return res.status(404).json({ error: "Scan introuvable." });
      return res.json({ ...scan, message: "Connectez-vous pour voir le détail des vulnérabilités." });
    }

    const scan = await ScanModel.findById(scanId);
    if (!scan) return res.status(404).json({ error: "Scan introuvable." });
    res.json(scan);
  } catch (err) {
    next(err);
  }
};

// GET /api/scans — Liste des scans de l'utilisateur connecté
const getScans = async (req, res, next) => {
  try {
    const scans = await ScanModel.findByUserId(req.user.id);
    res.json({ scans });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/scans/:id — Supprimer un scan
const deleteScan = async (req, res, next) => {
  try {
    const scanId = parseInt(req.params.id);
    if (isNaN(scanId)) return res.status(400).json({ error: "ID de scan invalide." });

    const scan = await ScanModel.findById(scanId);
    if (!scan) return res.status(404).json({ error: "Scan introuvable." });
    if (scan.userId !== req.user.id) return res.status(403).json({ error: "Accès refusé." });

    await ScanModel.delete(scanId);
    res.json({ message: "Scan supprimé." });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/scans/:id/favorite — Toggle favori
const toggleFavorite = async (req, res, next) => {
  try {
    const scanId = parseInt(req.params.id);
    if (isNaN(scanId)) return res.status(400).json({ error: "ID de scan invalide." });

    const scan = await ScanModel.toggleFavorite(scanId);
    if (!scan) return res.status(404).json({ error: "Scan introuvable." });
    res.json({ isFavorite: scan.isFavorite });
  } catch (err) {
    next(err);
  }
};

// GET /api/scans/:id/vulnerabilities — Liste filtrée des vulnérabilités
const getVulnerabilities = async (req, res, next) => {
  try {
    const scanId = parseInt(req.params.id);
    const { severity, owasp } = req.query;
    if (isNaN(scanId)) return res.status(400).json({ error: "ID de scan invalide." });

    const vulns = await ScanModel.getVulnerabilities(scanId, { severity, owasp });
    res.json({ vulnerabilities: vulns });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/scans/:id/vulnerabilities/:vulnId/fix — Marquer comme fixé
const markFixed = async (req, res, next) => {
  try {
    const vulnId = parseInt(req.params.vulnId);
    if (isNaN(vulnId)) return res.status(400).json({ error: "ID de vulnérabilité invalide." });

    const vuln = await ScanModel.markVulnFixed(vulnId);
    res.json({ message: "Vulnérabilité marquée comme fixée.", vulnerability: vuln });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/scans/:id/claim — Rattacher un scan anonyme à l'utilisateur connecté
const claimScan = async (req, res, next) => {
  try {
    const scanId = parseInt(req.params.id);
    if (isNaN(scanId)) return res.status(400).json({ error: "ID de scan invalide." });

    const scan = await ScanModel.findById(scanId);
    if (!scan) return res.status(404).json({ error: "Scan introuvable." });

    if (scan.userId !== null && scan.userId !== req.user.id) {
      return res.status(403).json({ error: "Ce scan appartient déjà à un autre utilisateur." });
    }

    if (scan.userId === req.user.id) {
      return res.json({ message: "Scan déjà rattaché.", scanId });
    }

    await ScanModel.claimScan(scanId, req.user.id);
    res.json({ message: "Scan rattaché à votre compte.", scanId });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createScan,
  getScan,
  getScans,
  deleteScan,
  toggleFavorite,
  getVulnerabilities,
  markFixed,
  claimScan,
};