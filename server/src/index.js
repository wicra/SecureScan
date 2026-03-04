const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

// === MIDDLEWARES GLOBAUX ===

// CORS — autorise le front React (port 5173 par défaut avec Vite)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  })
);

// Parse le body JSON
app.use(express.json({ limit: "10mb" }));

// Log des requêtes en dev
if (env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// === ROUTES ===

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SecureScan API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Toutes les routes de l'API
app.use("/api", routes);

// 404 — route non trouvée
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable.` });
});

// Gestion centralisée des erreurs (doit être en dernier)
app.use(errorMiddleware);

// === DÉMARRAGE ===

app.listen(env.PORT, () => {
  console.log(`\n🛡️  SecureScan API`);
  console.log(`   → http://localhost:${env.PORT}`);
  console.log(`   → Environnement : ${env.NODE_ENV}`);
  console.log(`   → Health check  : http://localhost:${env.PORT}/api/health\n`);
});

module.exports = app;