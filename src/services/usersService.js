const bcrypt = require("bcrypt");
const pool = require("../database/connection");

async function createUser({
  name,
  email,
  password,
  department,
  job_title,
}) {
  const passwordHash = await bcrypt.hash(password, 12);

  const query = `
    INSERT INTO users (
      name,
      email,
      password_hash,
      department,
      job_title
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      name,
      email,
      department,
      job_title,
      role,
      created_on;
  `;

  const values = [
    name,
    email.toLowerCase(),
    passwordHash,
    department,
    job_title,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

module.exports = {
  createUser,
};