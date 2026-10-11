function validateEnvironment() {
  const requiredVariables = [
    "SESSION_SECRET",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
  ];

  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missingVariables.join(", ")}`
    );
  }

  const dbPort = Number(process.env.DB_PORT);

  if (!Number.isInteger(dbPort) || dbPort <= 0 || dbPort > 65535) {
    throw new Error("DB_PORT deve ser uma porta válida.");
  }

  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET deve possuir pelo menos 32 caracteres."
    );
  }

  const allowedEnvironments = [
    "development",
    "test",
    "production",
  ];

  if (
    process.env.NODE_ENV &&
    !allowedEnvironments.includes(process.env.NODE_ENV)
  ) {
    throw new Error(
      "NODE_ENV deve ser development, test ou production."
    );
  }

  if (process.env.PORT) {
    const port = Number(process.env.PORT);

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error("PORT deve ser uma porta válida.");
    }
  }
}

module.exports = {
  validateEnvironment,
};