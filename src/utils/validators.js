function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidEmail(email) {
  if (!isNonEmptyString(email)) {
    return false;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email.trim());
}

function isPositiveInteger(value) {
  const number = Number(value);

  return (
    Number.isInteger(number) &&
    number > 0
  );
}

function isValidPassword(password) {
  if (typeof password !== "string") {
    return false;
  }

  const passwordLength = Buffer.byteLength(password, "utf8");

  return passwordLength >= 8 && passwordLength <= 72;
}

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isPositiveInteger,
  isValidPassword,
};