function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        message: "Usuário não autenticado.",
      });
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        message: "Você não possui permissão para realizar esta ação.",
      });
    }

    next();
  };
}

module.exports = requireRole;