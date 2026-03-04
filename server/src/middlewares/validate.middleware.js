const { z } = require("zod");

// Factory : crée un middleware de validation à partir d'un schéma Zod
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      return res.status(400).json({
        error: "Données invalides.",
        details: (err.errors || err.issues || []).map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
  };
};

// === Schémas de validation ===

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Email invalide."),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

const loginSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

const scanSchema = z.object({
  repoUrl: z
    .string()
    .url("URL invalide.")
    .refine(
      (url) =>
        url.includes("github.com") ||
        url.includes("gitlab.com") ||
        url.includes("bitbucket.org"),
      "L'URL doit être un dépôt GitHub, GitLab ou Bitbucket."
    ),
  analyzers: z
    .array(z.enum(["semgrep", "eslint", "npm-audit", "trufflehog", "bandit", "composer-audit"]))
    .min(1, "Sélectionnez au moins un analyseur.")
    .optional(),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  scanSchema,
};