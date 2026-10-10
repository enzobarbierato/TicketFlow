const pool = require("../database/connection");

async function createHistoryEvent(
  {
    ticketId,
    performedBy,
    eventType,
    fromUserId = null,
    toUserId = null,
    oldValue = null,
    newValue = null,
  },
  db = pool
) {
  const query = `
    INSERT INTO ticket_history (
      ticket_id,
      performed_by,
      event_type,
      from_user_id,
      to_user_id,
      old_value,
      new_value
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      id,
      ticket_id,
      performed_by,
      event_type,
      from_user_id,
      to_user_id,
      old_value,
      new_value,
      created_on;
  `;

  const values = [
    ticketId,
    performedBy,
    eventType,
    fromUserId,
    toUserId,
    oldValue,
    newValue,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

async function getTicketHistory(ticketId) {
  const query = `
    SELECT
      h.id,
      h.ticket_id,
      h.event_type,
      h.old_value,
      h.new_value,
      h.created_on,

      h.performed_by,
      performer.name AS performed_by_name,

      h.from_user_id,
      from_user.name AS from_user_name,

      h.to_user_id,
      to_user.name AS to_user_name

    FROM ticket_history h

    INNER JOIN users performer
      ON performer.id = h.performed_by

    LEFT JOIN users from_user
      ON from_user.id = h.from_user_id

    LEFT JOIN users to_user
      ON to_user.id = h.to_user_id

    WHERE h.ticket_id = $1

    ORDER BY
      h.created_on ASC,
      h.id ASC;
  `;

  const result = await pool.query(query, [ticketId]);

  return result.rows;
}

module.exports = {
  createHistoryEvent,
  getTicketHistory,
};