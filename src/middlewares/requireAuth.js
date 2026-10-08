function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      message: "Usuário não autenticado.",
    });
  }

  next();
}

module.exports = requireAuth;