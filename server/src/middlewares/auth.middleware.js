const jwt = require("jsonwebtoken");
const env = require("../config/env");
const UserModel = require("../models/user.model");

// Middleware obligatoire : bloque si pas de token valide
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Token manquant. Connectez-vous pour accéder à cette ressource.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Récupère l'utilisateur en BDD pour vérifier qu'il existe encore
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    // Attache l'utilisateur à la requête pour les controllers
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expiré. Reconnectez-vous." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token invalide." });
    }
    return res.status(500).json({ error: "Erreur d'authentification." });
  }
};

// Middleware optionnel : si un token est présent, on attache l'utilisateur
// Sinon on laisse passer (pour les routes publiques comme le score)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await UserModel.findById(decoded.userId);
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Token invalide ou expiré — on laisse passer sans user
  }

  next();
};

module.exports = { requireAuth, optionalAuth };