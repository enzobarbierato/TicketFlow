const pool = require("../database/connection");

async function createTicket({
  title,
  description,
  category,
  priority,
  created_by,
}) {
  const query = `
    INSERT INTO tickets (
      title,
      description,
      category,
      priority,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      title,
      description,
      category,
      priority,
      status,
      created_by,
      assigned_to,
      created_on,
      updated_on,
      closed_on;
  `;

  const values = [
    title,
    description,
    category,
    priority || "medium",
    created_by,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function getTicketsByUserId(userId) {
  const query = `
    SELECT
      id,
      title,
      description,
      category,
      priority,
      status,
      created_by,
      assigned_to,
      created_on,
      updated_on,
      closed_on
    FROM tickets
    WHERE created_by = $1
    ORDER BY created_on DESC;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

async function getTicketByIdAndUserId(ticketId, userId) {
  const query = `
    SELECT
      id,
      title,
      description,
      category,
      priority,
      status,
      created_by,
      assigned_to,
      created_on,
      updated_on,
      closed_on
    FROM tickets
    WHERE id = $1
      AND created_by = $2;
  `;

  const result = await pool.query(query, [ticketId, userId]);

  return result.rows[0] || null;
}

module.exports = {
  createTicket,
  getTicketsByUserId,
  getTicketByIdAndUserId,
};