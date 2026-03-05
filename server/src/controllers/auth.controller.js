const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const UserModel = require("../models/user.model");

// Génère un JWT token pour un utilisateur
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Vérifier si l'email existe déjà
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Cet email est déjà utilisé." });
    }

    // Hash du mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Création de l'utilisateur
    const user = await UserModel.create({ name, email, passwordHash });

    // Génération du token
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur par email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    // Générer le token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me — retourne l'utilisateur connecté
const me = async (req, res) => {
  // req.user est déjà attaché par le middleware requireAuth
  res.json({ user: req.user });
};

// GET /api/auth/github — redirige vers GitHub OAuth
const githubRedirect = (req, res) => {
  if (!env.GITHUB_CLIENT_ID) {
    return res.status(501).json({ error: "OAuth GitHub non configuré." });
  }

  // Le front peut passer l'ID du scan anonyme pour le rattacher après connexion
  const scanId = req.query.scanId || "";

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: "user:email",
    ...(scanId ? { state: scanId } : {}),
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

// GET /api/auth/github/callback — callback OAuth GitHub
const githubCallback = async (req, res, next) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Code OAuth manquant." });
    }

    // Échanger le code contre un access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(401).json({ error: "Échec de l'authentification GitHub." });
    }

    // Récupérer les infos de l'utilisateur GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const githubUser = await userResponse.json();

    // Récupérer l'email (peut être privé)
    const emailResponse = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const emails = await emailResponse.json();
    const primaryEmail = emails.find((e) => e.primary)?.email || githubUser.email;

    // Créer ou retrouver l'utilisateur
    const user = await UserModel.findOrCreateByGithub({
      githubId: String(githubUser.id),
      name: githubUser.name || githubUser.login,
      email: primaryEmail,
      avatarUrl: githubUser.avatar_url,
    });

    // Générer le JWT
    const token = generateToken(user);

    // Récupérer l'ID du scan anonyme passé en state (optionnel)
    const scanId = req.query.state || "";
    const scanParam = scanId ? `&scanId=${scanId}` : "";

    // Redirige vers le front avec le token dans l'URL
    // Le front le récupère et le stocke dans localStorage
    res.redirect(`http://localhost:3000/auth/callback?token=${token}${scanParam}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  me,
  githubRedirect,
  githubCallback,
};