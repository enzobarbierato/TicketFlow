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

async function createCategory(name) {
  const query = `
    INSERT INTO categories (name)
    VALUES ($1)
    RETURNING
      id,
      name,
      active,
      created_on;
  `;

  const result = await pool.query(query, [name]);

  return result.rows[0];
}

async function updateCategoryStatus(categoryId, active) {
  const query = `
    UPDATE categories
    SET active = $1
    WHERE id = $2
    RETURNING
      id,
      name,
      active,
      created_on;
  `;

  const result = await pool.query(query, [active, categoryId]);

  return result.rows[0] || null;
}

module.exports = {
  getCategoryById,
  getActiveCategories,
  createCategory,
  updateCategoryStatus,
};