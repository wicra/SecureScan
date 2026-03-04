
// OUTILS EXTERNES : AJOUT DES CHEMINS AU PATH POUR WINDOWS
// Permet de trouver semgrep, trufflehog, npm global, etc. même si Node n'hérite pas du PATH utilisateur

const path = require('path');


// LISTE DES DOSSIERS À AJOUTER AU PATH POUR TROUVER LES BINAIRES
const EXTRA_DIRS = [
  // TruffleHog (winget ou release GitHub)
  path.join(process.env.LOCALAPPDATA || '', 'trufflehog'),
  // Semgrep (Python 3.12 via winget/pip)
  path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts'),
  path.join(process.env.APPDATA     || '', 'Python', 'Python312', 'Scripts'),
  // npm global (Node via winget)
  path.join(process.env.APPDATA     || '', 'npm'),
].filter(Boolean);


// RENVOIE UN ENVIRONNEMENT AVEC UN PATH ÉTENDU POUR LES OUTILS EXTERNES
// À utiliser dans tous les spawn/exec pour garantir que les binaires sont trouvés
function toolsEnv() {
  const extra = EXTRA_DIRS.join(path.delimiter);
  return {
    ...process.env,
    PATH: (process.env.PATH || '') + path.delimiter + extra,
    // Force l'encodage UTF-8 pour Python (évite crash sur fichiers Unicode)
    PYTHONUTF8:        '1',
    PYTHONIOENCODING:  'utf-8',
  };
}


// EXPORT DE LA FONCTION PRINCIPALE
module.exports = { toolsEnv };
