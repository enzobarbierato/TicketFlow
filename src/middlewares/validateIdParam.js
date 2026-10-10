const { isPositiveInteger } = require("../utils/validators");

function validateIdParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!isPositiveInteger(value)) {
      return res.status(400).json({
        message: "Identificador inválido.",
      });
    }

    next();
  };
}

module.exports = validateIdParam;