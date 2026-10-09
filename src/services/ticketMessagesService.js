const pool = require("../database/connection");

async function createMessage({
  ticketId,
  userId,
  message,
}) {
  const query = `
    INSERT INTO ticket_messages (
      ticket_id,
      user_id,
      message
    )
    VALUES ($1, $2, $3)
    RETURNING
      id,
      ticket_id,
      user_id,
      message,
      created_on;
  `;

  const values = [
    ticketId,
    userId,
    message,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

module.exports = {
  createMessage,
};