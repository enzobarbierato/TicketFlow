const bcrypt = require("bcrypt");
const pool = require("../database/connection");

async function authenticateUser(email, password) {
  const query = `
    SELECT
      id,
      name,
      email,
      password_hash,
      department,
      job_title,
      role
    FROM users
    WHERE email = $1;
  `;

  const result = await pool.query(query, [email.toLowerCase()]);

  const user = result.rows[0];

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    return null;
  }

  delete user.password_hash;

  return user;
}

module.exports = {
  authenticateUser,
};