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

async function updateTicketStatus({
  ticketId,
  status,
  userId,
  userRole,
}) {
  let accessCondition = "";
  let values;

  if (userRole === "manager") {
    accessCondition = "id = $2";
    values = [status, ticketId];
  } else {
    accessCondition = `
      id = $2
      AND assigned_to = $3
    `;

    values = [status, ticketId, userId];
  }

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
      WHERE ${accessCondition}
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

  const result = await pool.query(query, values);

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

async function getFilteredTickets({
  userId,
  userRole,
  status,
  priority,
  categoryId,
  search,
  page,
  limit,
}) {
  const conditions = [];
  const values = [];

  function addValue(value) {
    values.push(value);
    return `$${values.length}`;
  }

  // Controle de acesso
  if (userRole === "user") {
    const userParam = addValue(userId);
    conditions.push(`t.created_by = ${userParam}`);
  }

  if (userRole === "support") {
    const userParam = addValue(userId);

    conditions.push(`
      (
        t.assigned_to IS NULL
        OR t.assigned_to = ${userParam}
      )
    `);
  }

  // Filtro por status
  if (status) {
    const statusParam = addValue(status);
    conditions.push(`t.status = ${statusParam}`);
  }

  // Filtro por prioridade
  if (priority) {
    const priorityParam = addValue(priority);
    conditions.push(`t.priority = ${priorityParam}`);
  }

  // Filtro por categoria
  if (categoryId) {
    const categoryParam = addValue(categoryId);
    conditions.push(`t.category_id = ${categoryParam}`);
  }

  // Busca textual
  if (search) {
    const searchParam = addValue(`%${search}%`);

    conditions.push(`
      (
        t.title ILIKE ${searchParam}
        OR t.description ILIKE ${searchParam}
        OR c.name ILIKE ${searchParam}
      )
    `);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  // Quantidade total antes da paginação
  const countQuery = `
    SELECT COUNT(*)::INTEGER AS total
    FROM tickets t
    INNER JOIN categories c
      ON c.id = t.category_id
    ${whereClause};
  `;

  const countResult = await pool.query(countQuery, values);
  const total = countResult.rows[0].total;

  const offset = (page - 1) * limit;

  const limitParam = addValue(limit);
  const offsetParam = addValue(offset);

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
    ${whereClause}
    ORDER BY t.created_on DESC
    LIMIT ${limitParam}
    OFFSET ${offsetParam};
  `;

  const result = await pool.query(query, values);

  return {
    tickets: result.rows,
    total,
  };
}

module.exports = {
  createTicket,
  getTicketsByUserId,
  getTicketByIdAndUserId,
  getTicketById,
  getTicketsForSupport,
  getAllTickets,
  getAccessibleTicketById,
  getFilteredTickets,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  assignTicketToUser,
};