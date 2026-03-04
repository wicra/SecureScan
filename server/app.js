const express = require('express');
const cors    = require('cors');
const logger  = require('morgan');

const router       = require('./src/routes/index');
const errorHandler = require('./src/middlewares/error.middleware');

const app = express();

// ── Middlewares globaux ────────────────────────────────────────────
app.use(cors());                             // Autorise les requêtes du frontend React
app.use(logger('dev'));                      // Logs HTTP en dev
app.use(express.json());                     // Parse le body JSON
app.use(express.urlencoded({ extended: false }));

// ── Routes API ────────────────────────────────────────────────────
app.use('/api', router);                     // Toutes les routes sous /api/...

// ── Sanity check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Gestion des erreurs (doit être en dernier) ────────────────────
app.use(errorHandler);

module.exports = app;

