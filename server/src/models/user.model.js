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
    let user = await prisma.user.findUnique({
      where: { githubId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          githubId,
          name,
          email,
          avatarUrl,
          passwordHash: "", // pas de password pour OAuth
        },
      });
    }

    return user;
  },
};

module.exports = UserModel;