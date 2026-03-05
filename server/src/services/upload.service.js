const fs   = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

const TMP_DIR = path.join(__dirname, '../../tmp');

const UploadService = {
  /**
   * Extrait un fichier ZIP dans un répertoire temporaire unique.
   * Si le zip contient un seul dossier racine, on retourne ce dossier directement
   * (comportement standard des archives GitHub/GitLab).
   *
   * @param {string} zipFilePath - chemin absolu du fichier zip uploadé
   * @returns {string} - chemin absolu du dossier extrait, prêt pour le scan
   */
  extractZip(zipFilePath) {
    const MAX_ZIP_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

    // Basic checks before extraction to avoid long/blocking operations
    const stats = fs.statSync(zipFilePath);
    if (stats.size > MAX_ZIP_BYTES) {
      throw new Error(`Archive trop volumineuse (${(stats.size / 1024 / 1024).toFixed(1)} MB). Limite: 200 MB.`);
    }

    // Check ZIP magic bytes (PK..) to detect non-zip uploads
    const fd = fs.openSync(zipFilePath, 'r');
    try {
      const header = Buffer.alloc(4);
      fs.readSync(fd, header, 0, 4, 0);
      const sig = header.toString('binary');
      if (!sig.startsWith('PK')) {
        throw new Error('Fichier uploadé n\'est pas une archive ZIP valide.');
      }
    } finally {
      fs.closeSync(fd);
    }

    const id = crypto.randomUUID();
    const extractDir = path.join(TMP_DIR, `scan-upload-${id}`);
    fs.mkdirSync(extractDir, { recursive: true });

    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(extractDir, /* overwrite */ true);

    // Si le zip contient un seul dossier à la racine, le retourner directement
    const entries = fs.readdirSync(extractDir);
    if (entries.length === 1) {
      const single = path.join(extractDir, entries[0]);
      try {
        if (fs.statSync(single).isDirectory()) {
          return single;
        }
      } catch (_) { /* ignore */ }
    }

    return extractDir;
  },

  /**
   * Supprime un répertoire temporaire (après scan ou en cas d'erreur).
   * @param {string} dirPath - chemin à supprimer
   */
  cleanup(dirPath) {
    if (!dirPath) return;
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } catch (e) {
      console.warn(`⚠️  UploadService.cleanup — ${dirPath} : ${e.message}`);
    }
  },
};

module.exports = UploadService;
