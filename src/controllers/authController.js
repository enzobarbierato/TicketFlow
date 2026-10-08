const authService = require("../services/authService");

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "E-mail e senha são obrigatórios.",
      });
    }

    const user = await authService.authenticateUser(email, password);

    if (!user) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      job_title: user.job_title,
      role: user.role,
    };

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      user: req.session.user,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

function getCurrentUser(req, res) {
  return res.status(200).json({
    user: req.session.user,
  });
}

module.exports = {
  login,
  getCurrentUser,
};