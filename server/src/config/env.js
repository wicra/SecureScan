const dotenv = require("dotenv");
const path = require("path");

// Charge le .env depuis la racine du dossier server/
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  PORT: parseInt(process.env.PORT) || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  TMP_SCAN_DIR: process.env.TMP_SCAN_DIR || "/tmp/securescan-repos",
};

// Validation : on vérifie que les variables critiques sont présentes
const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
  if (!env[key]) {
    console.error(`❌ Variable d'environnement manquante : ${key}`);
    console.error(`   Copiez .env.example en .env et remplissez les valeurs.`);
    process.exit(1);
  }
}

module.exports = env;