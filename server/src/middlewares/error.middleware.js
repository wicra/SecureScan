// Middleware de gestion centralisée des erreurs
// Doit toujours être le DERNIER middleware dans app.js

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status  = err.status || 500;
  const message = err.message || 'Erreur interne du serveur';

  console.error(`[ERROR] ${status} — ${message}`);

  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
