const authService = require("../services/authService");

const {
  isNonEmptyString,
  isValidEmail,
} = require("../utils/validators");

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "E-mail inválido.",
      });
    }

    if (!isNonEmptyString(password)) {
      return res.status(400).json({
        message: "A senha é obrigatória.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await authService.authenticateUser(
      normalizedEmail,
      password
    );

    if (!user) {
      return res.status(401).json({
        message: "E-mail ou senha inválidos.",
      });
    }

    await regenerateSession(req);

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      job_title: user.job_title,
      role: user.role,
    };

    await saveSession(req);

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
}

function getCurrentUser(req, res) {
  return res.status(200).json({
    user: req.session.user,
  });
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("ticketflow.sid");

    return res.status(200).json({
      message: "Logout realizado com sucesso.",
    });
  });
}

module.exports = {
  login,
  getCurrentUser,
  logout,
};