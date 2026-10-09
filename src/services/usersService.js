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

async function getUserById(userId) {
  const query = `
    SELECT
      id,
      name,
      email,
      department,
      job_title,
      role
    FROM users
    WHERE id = $1;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0] || null;
}

async function getSupportUsers() {
  const query = `
    SELECT
      id,
      name,
      email,
      department,
      job_title,
      role
    FROM users
    WHERE role = 'support'
    ORDER BY name ASC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

module.exports = {
  createUser,
  getUserById,
  getSupportUsers,
};
