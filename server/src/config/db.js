const { PrismaClient } = require("@prisma/client");

// Singleton : une seule instance de Prisma partagée dans toute l'app
// En dev, on la stocke dans globalThis pour éviter de recréer à chaque hot-reload
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;