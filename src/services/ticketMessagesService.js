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

async function getMessagesByTicketId(ticketId) {
  const query = `
    SELECT
      tm.id,
      tm.ticket_id,
      tm.user_id,
      tm.message,
      tm.created_on,
      u.name AS user_name
    FROM ticket_messages tm
    INNER JOIN users u
      ON u.id = tm.user_id
    WHERE tm.ticket_id = $1
    ORDER BY tm.created_on ASC;
  `;

  const result = await pool.query(query, [ticketId]);

  return result.rows;
}

module.exports = {
  createMessage,
  getMessagesByTicketId,
};