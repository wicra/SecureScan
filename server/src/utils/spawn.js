/**
 * Wrapper Promise autour de child_process.spawn.
 * Collecte stdout et stderr dans des buffers séparés (pas de pollution JSON).
 * Non-bloquant — ne gèle pas la boucle d'événements Node.js.
 *
 * @param {string}   cmd       - Commande à exécuter
 * @param {string[]} args      - Arguments
 * @param {object}   opts      - Options (timeout, env, cwd, shell, maxBytes)
 * @returns {Promise<{stdout:string, stderr:string, code:number|null}>}
 */
const { spawn } = require('child_process');

function spawnAsync(cmd, args = [], opts = {}) {
  const {
    timeout  = 120_000,
    env      = process.env,
    cwd      = undefined,
    shell    = true,
    maxBytes = 50 * 1024 * 1024, // 50 MB
  } = opts;

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      env,
      cwd,
      shell,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      if (stdout.length < maxBytes) stdout += chunk.toString('utf8');
    });
    proc.stderr.on('data', (chunk) => {
      if (stderr.length < 1_000_000) stderr += chunk.toString('utf8');
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = { spawnAsync };
