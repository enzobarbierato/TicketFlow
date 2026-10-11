const { rateLimit } = require("express-rate-limit");

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: true,
  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    message:
      "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.",
  },
});

module.exports = loginRateLimit;