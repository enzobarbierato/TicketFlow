function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error);

  const statusCode =
    Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    return res.status(statusCode).json({
      message: "Erro interno do servidor.",
    });
  }

  return res.status(statusCode).json({
    message: error.message,
  });
}

module.exports = errorHandler;