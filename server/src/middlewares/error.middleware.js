// Middleware de gestion d'erreurs centralisé
// Doit être monté en DERNIER dans Express (après toutes les routes)
const errorMiddleware = (err, req, res, next) => {
  console.error(`❌ [${req.method} ${req.path}]`, err.message);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  // Erreurs de validation Zod
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Données invalides.",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Erreurs Prisma
  if (err.code === "P2002") {
    return res.status(409).json({
      error: "Cette ressource existe déjà.",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: "Ressource introuvable.",
    });
  }

  // Erreur générique
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Erreur interne du serveur.",
  });
};

module.exports = errorMiddleware;