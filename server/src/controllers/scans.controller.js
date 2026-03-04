const fs = require("fs");
const path = require("path");
const multer = require("multer");
const ScanModel = require("../models/scan.model");
const GitService = require("../services/git.service");
const ScannerService = require("../services/scanner.service");
const UploadService = require("../services/upload.service");
const AiService = require("../services/ai.service");

// ─── Configuration multer (upload ZIP) ────────────────────────────────────────
const UPLOADS_TMP = path.join(__dirname, '../../tmp/uploads');
fs.mkdirSync(UPLOADS_TMP, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_TMP),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers ZIP sont acceptés.'));
    }
  },
}).single('file');
// ─────────────────────────────────────────────────────────────────────────────

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

// POST /api/scans/upload — Scanner un fichier ZIP uploadé (drag-and-drop)
const uploadScan = async (req, res, next) => {
  let extractedPath = null;
  let uploadedFilePath = req.file?.path || null;
  let scan = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    uploadedFilePath = req.file.path;
    const repoName = req.file.originalname.replace(/\.zip$/i, '') || 'upload';

    console.log(`📦 Upload reçu : ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} Mo)`);

    // Créer le scan en BDD
    scan = await ScanModel.create({
      userId: req.user ? req.user.id : null,
      repoUrl: `upload://${repoName}`,
      repoName,
    });

    await ScanModel.markRunning(scan.id);
    console.log(`🚀 Scan #${scan.id} (upload) lancé pour ${repoName}`);

    // Extraire le ZIP
    extractedPath = UploadService.extractZip(uploadedFilePath);
    console.log(`📂 Extrait dans : ${extractedPath}`);

    // Détecter le langage
    const language = GitService.detectLanguage(extractedPath);
    if (language) await ScanModel.updateLanguage(scan.id, language);

    // Lancer les analyseurs
    const results = await ScannerService.runFullScan(extractedPath);

    // Stocker les stats
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

    // Nettoyage
    UploadService.cleanup(extractedPath);
    try { fs.unlinkSync(uploadedFilePath); } catch (_) {}

    console.log(`✅ Scan #${scan.id} (upload) terminé — Score: ${results.score}/100`);

    if (!req.user) {
      return res.status(201).json({
        scanId: scan.id,
        repoName,
        score: results.score,
        grade: results.grade,
        totalVulnerabilities: results.totalVulnerabilities,
        message: 'Connectez-vous pour voir le détail des vulnérabilités.',
      });
    }

    res.status(201).json({ scanId: scan.id, repoName, language, ...results });
  } catch (err) {
    if (extractedPath) UploadService.cleanup(extractedPath);
    if (uploadedFilePath) { try { fs.unlinkSync(uploadedFilePath); } catch (_) {} }
    if (scan?.id) await ScanModel.markFailed(scan.id).catch(() => {});
    console.error(`❌ Scan upload échoué :`, err.message);
    next(err);
  }
};
// POST /api/scans/:id/vulnerabilities/:vulnId/ai-fix — Générer un fix IA on-demand
// Appelé quand fixSuggestion est null et que l'utilisateur clique "AI Fix"
const getAiFix = async (req, res, next) => {
  try {
    const vulnId = parseInt(req.params.vulnId);
    if (isNaN(vulnId)) {
      return res.status(400).json({ error: "ID de vulnérabilité invalide." });
    }

    // RÉCUPÈRE LA VULN EN DB
    const vuln = await ScanModel.findVulnById(vulnId);
    if (!vuln) {
      return res.status(404).json({ error: "Vulnérabilité introuvable." });
    }

    // SI FIX DÉJÀ EN DB, ON LE RETOURNE SANS APPELER L'IA (économie d'appel)
    if (vuln.fixSuggestion) {
      return res.json({ fixSuggestion: vuln.fixSuggestion, cached: true });
    }

    // APPEL IA POUR GÉNÉRER LE FIX
    const fix = await AiService.getAiFixForVuln(vuln);

    // STOCKE EN DB POUR LES PROCHAINES FOIS
    await ScanModel.updateFixSuggestion(vulnId, fix);

    res.json({ fixSuggestion: fix, cached: false });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createScan,
  uploadScan,
  uploadMiddleware,
  getScan,
  getScans,
  deleteScan,
  toggleFavorite,
  getVulnerabilities,
  markFixed,
  getAiFix,
};