const { Router } = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate, registerSchema, loginSchema } = require("../middlewares/validate.middleware");

const router = Router();

// Routes publiques
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);

// OAuth GitHub
router.get("/github", authController.githubRedirect);
router.get("/github/callback", authController.githubCallback);

// Route protégée
router.get("/me", requireAuth, authController.me);

module.exports = router;