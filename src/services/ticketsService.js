const pool = require("../database/connection");

async function createTicket({
  title,
  description,
  category_id,
  priority,
  created_by,
}) {
  const query = `
    WITH inserted_ticket AS (
      INSERT INTO tickets (
        title,
        description,
        category_id,
        priority,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    )
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM inserted_ticket t
    INNER JOIN categories c
      ON c.id = t.category_id;
  `;

  const values = [
    title,
    description,
    category_id,
    priority || "medium",
    created_by,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function getTicketsByUserId(userId) {
  const query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM tickets t
    INNER JOIN categories c
      ON c.id = t.category_id
    WHERE t.created_by = $1
    ORDER BY t.created_on DESC;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

async function getTicketByIdAndUserId(ticketId, userId) {
  const query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM tickets t
    INNER JOIN categories c
      ON c.id = t.category_id
    WHERE t.id = $1
      AND t.created_by = $2;
  `;

  const result = await pool.query(query, [ticketId, userId]);

  return result.rows[0] || null;
}

async function getTicketById(ticketId) {
  const query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM tickets t
    INNER JOIN categories c
      ON c.id = t.category_id
    WHERE t.id = $1;
  `;

  const result = await pool.query(query, [ticketId]);

  return result.rows[0] || null;
}

async function getTicketsForSupport(userId) {
  const query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM tickets t
    INNER JOIN categories c
      ON c.id = t.category_id
    WHERE t.assigned_to IS NULL
       OR t.assigned_to = $1
    ORDER BY t.created_on DESC;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

async function getAllTickets() {
  const query = `
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM tickets t
    INNER JOIN categories c
      ON c.id = t.category_id
    ORDER BY t.created_on DESC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

async function getAccessibleTicketById({
  ticketId,
  userId,
  userRole,
}) {
  let query;
  let values;

  if (userRole === "manager") {
    query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.category_id,
        c.name AS category_name,
        t.priority,
        t.status,
        t.created_by,
        t.assigned_to,
        t.created_on,
        t.updated_on,
        t.closed_on
      FROM tickets t
      INNER JOIN categories c
        ON c.id = t.category_id
      WHERE t.id = $1;
    `;

    values = [ticketId];
  } else if (userRole === "support") {
    query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.category_id,
        c.name AS category_name,
        t.priority,
        t.status,
        t.created_by,
        t.assigned_to,
        t.created_on,
        t.updated_on,
        t.closed_on
      FROM tickets t
      INNER JOIN categories c
        ON c.id = t.category_id
      WHERE t.id = $1
        AND (
          t.assigned_to IS NULL
          OR t.assigned_to = $2
        );
    `;

    values = [ticketId, userId];
  } else {
    query = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.category_id,
        c.name AS category_name,
        t.priority,
        t.status,
        t.created_by,
        t.assigned_to,
        t.created_on,
        t.updated_on,
        t.closed_on
      FROM tickets t
      INNER JOIN categories c
        ON c.id = t.category_id
      WHERE t.id = $1
        AND t.created_by = $2;
    `;

    values = [ticketId, userId];
  }

  const result = await pool.query(query, values);

  return result.rows[0] || null;
}

async function updateTicketStatus(ticketId, status) {
  const query = `
    WITH updated_ticket AS (
      UPDATE tickets
      SET
        status = $1::VARCHAR(30),
        updated_on = NOW(),
        closed_on = CASE
          WHEN $1::VARCHAR(30) = 'closed' THEN NOW()
          ELSE NULL
        END
      WHERE id = $2
      RETURNING *
    )
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM updated_ticket t
    INNER JOIN categories c
      ON c.id = t.category_id;
  `;

  const result = await pool.query(query, [status, ticketId]);

  return result.rows[0] || null;
}

async function updateTicketPriority(ticketId, priority) {
  const query = `
    WITH updated_ticket AS (
      UPDATE tickets
      SET
        priority = $1,
        updated_on = NOW()
      WHERE id = $2
      RETURNING *
    )
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM updated_ticket t
    INNER JOIN categories c
      ON c.id = t.category_id;
  `;

  const result = await pool.query(query, [priority, ticketId]);

  return result.rows[0] || null;
}

async function assignTicket(ticketId, userId) {
  const query = `
    WITH updated_ticket AS (
      UPDATE tickets
      SET
        assigned_to = $1,
        updated_on = NOW()
      WHERE id = $2
        AND assigned_to IS NULL
      RETURNING *
    )
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM updated_ticket t
    INNER JOIN categories c
      ON c.id = t.category_id;
  `;

  const result = await pool.query(query, [userId, ticketId]);

  return result.rows[0] || null;
}

async function assignTicketToUser(ticketId, userId) {
  const query = `
    WITH updated_ticket AS (
      UPDATE tickets
      SET
        assigned_to = $1,
        updated_on = NOW()
      WHERE id = $2
      RETURNING *
    )
    SELECT
      t.id,
      t.title,
      t.description,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on
    FROM updated_ticket t
    INNER JOIN categories c
      ON c.id = t.category_id;
  `;

  const result = await pool.query(query, [userId, ticketId]);

  return result.rows[0] || null;
}

module.exports = {
  createTicket,
  getTicketsByUserId,
  getTicketByIdAndUserId,
  getTicketById,
  getTicketsForSupport,
  getAllTickets,
  getAccessibleTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  assignTicketToUser,
};