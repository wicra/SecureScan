const prisma = require("../config/db");

const UserModel = {
  // Créer un utilisateur
  async create({ name, email, passwordHash }) {
    return prisma.user.create({
      data: { name, email, passwordHash },
    });
  },

  // Trouver par email (pour le login)
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  // Trouver par ID (pour le middleware auth)
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    });
  },

  // Trouver ou créer via GitHub OAuth
  async findOrCreateByGithub({ githubId, name, email, avatarUrl }) {
    // 1. Chercher par githubId (connexion GitHub déjà liée)
    let user = await prisma.user.findUnique({
      where: { githubId },
    });

    if (user) return user;

    // 2. Chercher par email (compte email/password existant)
    //    → relier le compte GitHub au compte existant
    if (email) {
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId,
            avatarUrl: avatarUrl || user.avatarUrl,
          },
        });
        return user;
      }
    }

    // 3. Aucun compte trouvé → créer un nouveau
    user = await prisma.user.create({
      data: {
        githubId,
        name,
        email,
        avatarUrl,
        passwordHash: null, // pas de password pour OAuth
      },
    });

    return user;
  },
};

module.exports = UserModel;