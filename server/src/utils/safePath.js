/**
 * Utilitaire de sécurité : validation de chemins de fichiers
 *
 * Empêche les attaques de type Path Traversal (../ etc.)
 * en s'assurant que le chemin résolu reste bien dans le répertoire autorisé.
 */

const path = require('path');

/**
 * Construit et valide un chemin en s'assurant qu'il reste dans baseDir.
 * Lance une erreur si le chemin tente de sortir du répertoire autorisé.
 *
 * @param {string} baseDir  - Répertoire racine autorisé (ex: tmpDir, __dirname)
 * @param {...string} parts - Parties du chemin à joindre
 * @returns {string}        - Chemin absolu validé
 * @throws {Error}          - Si le chemin sort de baseDir (traversal détecté)
 */
function safePath(baseDir, ...parts) {
  const base     = path.resolve(baseDir);
  const resolved = path.resolve(base, ...parts);

  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal détecté : "${resolved}" sort de "${base}"`);
  }

  return resolved;
}

module.exports = { safePath };
