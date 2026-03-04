const ScanModel = require("../models/scan.model");
const GitService = require("../services/git.service");
const ScannerService = require("../services/scanner.service");

// POST /api/scans — Lancer un nouveau scan
const createScan = async (req, res, next) => {
  let repoPath = null;

  try {
    const { repoUrl, analyzers } = req.body;

    // Extraire le nom du repo
    const repoName = GitService.extractRepoName(repoUrl);

    // Créer le scan en BDD (status: pending)
    const scan = await ScanModel.create({
      userId: req.user ? req.user.id : null,
      repoUrl,
      repoName,
    });

    console.log(`🚀 Scan #${scan.id} lancé pour ${repoName}`);

    // Status → running
    await ScanModel.markRunning(scan.id);

    // 1. Cloner le repo
    repoPath = await GitService.cloneRepo(repoUrl);

    // Détecter le langage et persister immédiatement en DB
    const language = GitService.detectLanguage(repoPath);
    if (language) {
      await ScanModel.updateLanguage(scan.id, language);
    }

    // 2. Lancer les analyseurs
    const results = await ScannerService.runFullScan(repoPath);

    // 3. Stocker les stats dans la table scans
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

    // 4. Insérer chaque vulnérabilité dans la table vulnerabilities
    if (results.vulnerabilities.length > 0) {
      await ScanModel.insertVulnerabilities(scan.id, results.vulnerabilities);
    }

    // 5. Nettoyer le repo cloné
    GitService.cleanup(repoPath);

    console.log(`✅ Scan #${scan.id} terminé — Score: ${results.score}/100 — ${results.totalVulnerabilities} vulns`);

    // Retourner les résultats
    // Si l'utilisateur n'est pas connecté → score uniquement
    if (!req.user) {
      return res.status(201).json({
        scanId: scan.id,
        repoName,
        score: results.score,
        grade: results.grade,
        totalVulnerabilities: results.totalVulnerabilities,
        message: "Connectez-vous pour voir le détail des vulnérabilités.",
      });
    }

    // Utilisateur connecté → résultats complets
    res.status(201).json({
      scanId: scan.id,
      repoName,
      language,
      ...results,
    });
  } catch (err) {
    // MARQUER LE SCAN COMME ÉCHOUÉ EN DB AVANT DE PROPAGER L'ERREUR
    if (repoPath) GitService.cleanup(repoPath);
    if (typeof scan !== 'undefined' && scan?.id) {
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

    // Si l'utilisateur n'est pas connecté → score uniquement
    if (!req.user) {
      const scan = await ScanModel.findScoreOnly(scanId);
      if (!scan) {
        return res.status(404).json({ error: "Scan introuvable." });
      }
      return res.json({
        ...scan,
        message: "Connectez-vous pour voir le détail des vulnérabilités.",
      });
    }

    // Utilisateur connecté → résultats complets avec vulnérabilités
    const scan = await ScanModel.findById(scanId);
    if (!scan) {
      return res.status(404).json({ error: "Scan introuvable." });
    }

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

    if (isNaN(scanId)) {
      return res.status(400).json({ error: "ID de scan invalide." });
    }

    // Vérifier que le scan appartient à l'utilisateur
    const scan = await ScanModel.findById(scanId);
    if (!scan) {
      return res.status(404).json({ error: "Scan introuvable." });
    }
    if (scan.userId !== req.user.id) {
      return res.status(403).json({ error: "Accès refusé." });
    }

    // onDelete: Cascade dans le schema → supprime vulns et reports auto
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

    if (isNaN(scanId)) {
      return res.status(400).json({ error: "ID de scan invalide." });
    }

    const scan = await ScanModel.toggleFavorite(scanId);
    if (!scan) {
      return res.status(404).json({ error: "Scan introuvable." });
    }

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

    if (isNaN(scanId)) {
      return res.status(400).json({ error: "ID de scan invalide." });
    }

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

    if (isNaN(vulnId)) {
      return res.status(400).json({ error: "ID de vulnérabilité invalide." });
    }

    const vuln = await ScanModel.markVulnFixed(vulnId);
    res.json({ message: "Vulnérabilité marquée comme fixée.", vulnerability: vuln });
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
};