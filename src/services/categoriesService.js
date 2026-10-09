const pool = require("../database/connection");

async function getCategoryById(categoryId) {
  const query = `
    SELECT
      id,
      name,
      active,
      created_on
    FROM categories
    WHERE id = $1;
  `;

  const result = await pool.query(query, [categoryId]);

  return result.rows[0] || null;
}

async function getActiveCategories() {
  const query = `
    SELECT
      id,
      name
    FROM categories
    WHERE active = TRUE
    ORDER BY name ASC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

module.exports = {
  getCategoryById,
  getActiveCategories,
};