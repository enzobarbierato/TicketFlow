const usersService = require("../services/usersService");

async function createUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      department,
      job_title,
    } = req.body;

    if (!name || !email || !password || !department || !job_title) {
      return res.status(400).json({
        message: "Todos os campos são obrigatórios.",
      });
    }

    const user = await usersService.createUser({
      name,
      email,
      password,
      department,
      job_title,
    });

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Já existe um usuário cadastrado com este e-mail.",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  createUser,
};