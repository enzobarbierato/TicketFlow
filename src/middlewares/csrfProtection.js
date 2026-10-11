const crypto = require("crypto");

function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
  const safeMethods = [
    "GET",
    "HEAD",
    "OPTIONS",
  ];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const sessionToken = req.session?.csrfToken;
  const requestToken = req.get("x-csrf-token");

  if (!sessionToken || !requestToken) {
    return res.status(403).json({
      message: "Token CSRF ausente ou inválido.",
    });
  }

  const sessionTokenBuffer = Buffer.from(sessionToken);
  const requestTokenBuffer = Buffer.from(requestToken);

  if (
    sessionTokenBuffer.length !== requestTokenBuffer.length ||
    !crypto.timingSafeEqual(
      sessionTokenBuffer,
      requestTokenBuffer
    )
  ) {
    return res.status(403).json({
      message: "Token CSRF ausente ou inválido.",
    });
  }

  return next();
}

module.exports = {
  ensureCsrfToken,
  csrfProtection,
};