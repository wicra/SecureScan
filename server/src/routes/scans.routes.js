const { Router } = require("express");
const scansController = require("../controllers/scans.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
const { validate, scanSchema } = require("../middlewares/validate.middleware");

const router = Router();

// POST /api/scans/upload — Scanner un ZIP uploadé (drag-and-drop)
// Doit être déclaré AVANT la route /:id pour éviter un conflit de paramètre
router.post(
  "/upload",
  optionalAuth,
  (req, res, next) => {
    scansController.uploadMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  scansController.uploadScan
);

// POST /api/scans — Lancer un scan
// optionalAuth : un visiteur peut scanner, mais seul le score sera retourné
router.post("/", optionalAuth, validate(scanSchema), scansController.createScan);

// GET /api/scans — Liste des scans (connecté obligatoire)
router.get("/", requireAuth, scansController.getScans);

// GET /api/scans/:id — Détail d'un scan
// optionalAuth : visiteur = score only, connecté = résultats complets
router.get("/:id", optionalAuth, scansController.getScan);

// DELETE /api/scans/:id — Supprimer un scan (connecté obligatoire)
router.delete("/:id", requireAuth, scansController.deleteScan);

// PATCH /api/scans/:id/favorite — Toggle favori (connecté obligatoire)
router.patch("/:id/favorite", requireAuth, scansController.toggleFavorite);

// GET /api/scans/:id/vulnerabilities — Liste filtrée des vulns (connecté obligatoire)
// Query params : ?severity=critical&owasp=A05:2025
router.get("/:id/vulnerabilities", requireAuth, scansController.getVulnerabilities);

// PATCH /api/scans/:id/vulnerabilities/:vulnId/fix — Marquer comme fixé
router.patch("/:id/vulnerabilities/:vulnId/fix", requireAuth, scansController.markFixed);

module.exports = router;