const usersService = require("../services/usersService");
const {isNonEmptyString,isValidEmail,isValidPassword,} = require("../utils/validators");

async function createUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      department,
      job_title,
    } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        message: "O nome é obrigatório.",
      });
    }

    if (name.trim().length > 120) {
      return res.status(400).json({
        message: "O nome deve ter no máximo 120 caracteres.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "E-mail inválido.",
      });
    }

    if (email.trim().length > 160) {
      return res.status(400).json({
        message: "O e-mail deve ter no máximo 160 caracteres.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "A senha deve possuir entre 8 e 72 bytes.",
      });
    }

    if (!isNonEmptyString(department)) {
      return res.status(400).json({
        message: "O departamento é obrigatório.",
      });
    }

    if (department.trim().length > 100) {
      return res.status(400).json({
        message: "O departamento deve ter no máximo 100 caracteres.",
      });
    }

    if (!isNonEmptyString(job_title)) {
      return res.status(400).json({
        message: "O cargo é obrigatório.",
      });
    }

    if (job_title.trim().length > 100) {
      return res.status(400).json({
        message: "O cargo deve ter no máximo 100 caracteres.",
      });
    }

    const user = await usersService.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      department: department.trim(),
      job_title: job_title.trim(),
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

async function getSupportUsers(req, res) {
  try {
    const supportUsers = await usersService.getSupportUsers();

    return res.status(200).json({
      users: supportUsers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  createUser,
  getSupportUsers,
};
