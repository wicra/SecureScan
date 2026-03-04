const { Router } = require("express");
const scansController = require("../controllers/scans.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
const { validate, scanSchema } = require("../middlewares/validate.middleware");

const router = Router();

// POST /api/scans — Lancer un scan
router.post("/", optionalAuth, validate(scanSchema), scansController.createScan);

// GET /api/scans — Liste des scans (connecté obligatoire)
router.get("/", requireAuth, scansController.getScans);

// GET /api/scans/:id — Détail d'un scan
router.get("/:id", optionalAuth, scansController.getScan);

// DELETE /api/scans/:id — Supprimer un scan
router.delete("/:id", requireAuth, scansController.deleteScan);

// PATCH /api/scans/:id/claim — Rattacher un scan anonyme à l'utilisateur connecté
router.patch("/:id/claim", requireAuth, scansController.claimScan);

// PATCH /api/scans/:id/favorite — Toggle favori
router.patch("/:id/favorite", requireAuth, scansController.toggleFavorite);

// GET /api/scans/:id/vulnerabilities — Liste filtrée des vulns
router.get("/:id/vulnerabilities", requireAuth, scansController.getVulnerabilities);

// PATCH /api/scans/:id/vulnerabilities/:vulnId/fix — Marquer comme fixé
router.patch("/:id/vulnerabilities/:vulnId/fix", requireAuth, scansController.markFixed);

module.exports = router;