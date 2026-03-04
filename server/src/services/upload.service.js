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
