
// SERVICE IA — CORRECTION ON-DEMAND D'UNE VULNÉRABILITÉ
// Appelé uniquement quand l'utilisateur demande un fix pour une vuln spécifique.
// 1 vulnérabilité = 1 requête LLM = 1 réponse avec le code corrigé.

const https = require('https');
const env   = require('../config/env');

// MODÈLES GRATUITS OPENROUTER (is_moderated:false — les prompts sécurité ne sont pas bloqués)
const OPENROUTER_MODELS = [
  'google/gemma-3-27b-it:free',  // principal
  'google/gemma-3-12b-it:free',  // fallback
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// APPEL AVEC FALLBACK — essaie chaque modèle de la liste jusqu'à obtenir une réponse
async function callWithRetry(prompt) {
  let lastErr;
  for (const model of OPENROUTER_MODELS) {
    try {
      return await callOpenRouter(prompt, model);
    } catch (err) {
      lastErr = err;
      const isRetryable = err.message.includes('Rate limit') || err.message.includes('Provider returned error');
      if (isRetryable) {
        console.warn(`    ↻ [AI] ${model} indisponible, essai du modèle suivant...`);
        await sleep(2_000); // petite pause avant de tenter le suivant
      } else {
        throw err; // erreur non récupérable (auth, prompt invalide...)
      }
    }
  }
  throw lastErr; // tous les modèles ont échoué
}

// APPEL HTTP VERS OPENROUTER 
function callOpenRouter(prompt, model = OPENROUTER_MODELS[0]) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens:   1200,  // assez pour un bloc de code complet
      temperature:  0.1,
    });

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  📤 [AI] → ${model}`);
    console.log(`─── PROMPT ───────────────────────────────────────────────────────────`);
    console.log(prompt);
    console.log(`──────────────────────────────────────────────────────────────────────`);

    const options = {
      hostname: 'openrouter.ai',
      path:     '/api/v1/chat/completions',
      method:   'POST',
      headers:  {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer':  'https://securescan.dev',
        'X-Title':       'SecureScan',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`OpenRouter API: ${parsed.error.message || JSON.stringify(parsed.error)}`));
            return;
          }
          const content = parsed.choices?.[0]?.message?.content || '';
          console.log(`─── RÉPONSE (HTTP ${res.statusCode}) ──────────────────────────────────────────`);
          console.log(content);
          console.log(`${'═'.repeat(70)}\n`);
          resolve(content);
        } catch {
          reject(new Error(`OpenRouter: réponse invalide — ${data.slice(0, 200)}`));
        }
      });
    });

    req.setTimeout(20_000, () => { req.destroy(); reject(new Error('OpenRouter: timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE LA RÉPONSE — nettoie les balises <think> et le markdown
// ─────────────────────────────────────────────────────────────────────────────
function parseAiResponse(content) {
  // Supprime les blocs <think>...</think> (DeepSeek / mode reasoning)
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Supprime les fences markdown (```js ... ``` ou ``` ... ```)
  cleaned = cleaned.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// ON-DEMAND : génère le code corrigé pour UNE vulnérabilité
// Appelé depuis le controller POST /api/scans/:id/vulnerabilities/:vulnId/ai-fix
//
// @param {Object} vuln  - ligne de la table vulnerabilities (depuis DB)
// @returns {string}     - code corrigé (pas une description, du vrai code)
// ─────────────────────────────────────────────────────────────────────────────
async function getAiFixForVuln(vuln) {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY manquante');
  if (!vuln.codeSnippet)       throw new Error('Aucun code source disponible pour cette vulnérabilité');

  const ext      = (vuln.filePath || '').split('.').at(-1) || 'js';
  const fileName = (vuln.filePath || 'unknown').split(/[/\\]/).pop();

  const prompt = [
    `You are an expert security engineer. A static analysis tool flagged the code below as vulnerable.`,
    `Your ONLY job is to output the fixed version of that code — nothing else.`,
    ``,
    `### Context`,
    `- File      : ${fileName}`,
    `- Language  : ${ext}`,
    `- Severity  : ${vuln.severity}`,
    `- Rule      : ${vuln.ruleId || vuln.owaspCategory || 'security issue'}`,
    `- Issue     : ${vuln.description || 'Security vulnerability detected'}`,
    `- Location  : lines ${vuln.lineStart || '?'}–${vuln.lineEnd || '?'}`,
    ``,
    `### Vulnerable code`,
    `\`\`\`${ext}`,
    vuln.codeSnippet.trim(),
    `\`\`\``,
    ``,
    `### What to do`,
    `Rewrite the snippet above to fix the vulnerability.`,
    `Apply the minimal change needed: fix the security issue, preserve the original logic.`,
    ``,
    `### Output format (STRICT)`,
    `- Output ONLY the corrected ${ext} code`,
    `- Do NOT wrap it in markdown fences`,
    `- Do NOT add any explanation, comment, or prose before or after the code`,
    `- Do NOT repeat the vulnerable version`,
    `- The output must be valid, compilable ${ext} code`,
  ].join('\n');

  const response = await callWithRetry(prompt);
  return parseAiResponse(response);
}

// EXPORT DU MODULE
module.exports = { getAiFixForVuln };
