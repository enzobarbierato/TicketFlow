const pool = require("../database/connection");
const ticketHistoryService = require("./ticketHistoryService");

async function createTicket({
  title,
  description,
  category_id,
  priority,
  created_by,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ticketPriority = priority || "medium";

    const result = await client.query(
      `
        WITH created_ticket AS (
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
        FROM created_ticket t

        INNER JOIN categories c
          ON c.id = t.category_id;
      `,
      [
        title,
        description,
        category_id,
        ticketPriority,
        created_by,
      ]
    );

    const ticket = result.rows[0];

    await ticketHistoryService.createHistoryEvent(
      {
        ticketId: ticket.id,
        performedBy: created_by,
        eventType: "created",
      },
      client
    );

    await client.query("COMMIT");

    return ticket;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let currentTicketQuery;
    let currentTicketValues;

    if (userRole === "manager") {
      currentTicketQuery = `
        SELECT
          id,
          status,
          assigned_to
        FROM tickets
        WHERE id = $1
        FOR UPDATE;
      `;

      currentTicketValues = [ticketId];
    } else {
      currentTicketQuery = `
        SELECT
          id,
          status,
          assigned_to
        FROM tickets
        WHERE id = $1
          AND assigned_to = $2
        FOR UPDATE;
      `;

      currentTicketValues = [ticketId, userId];
    }

    const currentTicketResult = await client.query(
      currentTicketQuery,
      currentTicketValues
    );

    if (currentTicketResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const currentTicket = currentTicketResult.rows[0];

    const updateQuery = `
      WITH updated_ticket AS (
        UPDATE tickets
        SET
          status = $1::VARCHAR(30),
          updated_on = NOW(),
          closed_on = CASE
            WHEN $1::VARCHAR(30) = 'closed'
              THEN NOW()
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

    const updatedResult = await client.query(updateQuery, [
      status,
      ticketId,
    ]);

    await ticketHistoryService.createHistoryEvent(
      {
        ticketId,
        performedBy: userId,
        eventType: "status_changed",
        oldValue: currentTicket.status,
        newValue: status,
      },
      client
    );

    await client.query("COMMIT");

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateTicketPriority(ticketId, priority, performedBy) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentTicketResult = await client.query(
      `
        SELECT
          id,
          priority
        FROM tickets
        WHERE id = $1
        FOR UPDATE;
      `,
      [ticketId]
    );

    if (currentTicketResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const currentTicket = currentTicketResult.rows[0];

    if (currentTicket.priority === priority) {
      await client.query("ROLLBACK");

      return {
        unchanged: true,
        ticket: currentTicket,
      };
    }

    const updatedResult = await client.query(
      `
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
      `,
      [priority, ticketId]
    );

    await ticketHistoryService.createHistoryEvent(
      {
        ticketId,
        performedBy,
        eventType: "priority_changed",
        oldValue: currentTicket.priority,
        newValue: priority,
      },
      client
    );

    await client.query("COMMIT");

    return {
      unchanged: false,
      ticket: updatedResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function assignTicket(ticketId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentTicketResult = await client.query(
      `
        SELECT
          id,
          assigned_to
        FROM tickets
        WHERE id = $1
        FOR UPDATE;
      `,
      [ticketId]
    );

    if (currentTicketResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const currentTicket = currentTicketResult.rows[0];

    if (currentTicket.assigned_to !== null) {
      await client.query("ROLLBACK");
      return null;
    }

    const updateQuery = `
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

    const updatedResult = await client.query(updateQuery, [
      userId,
      ticketId,
    ]);

    if (updatedResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    await ticketHistoryService.createHistoryEvent(
      {
        ticketId,
        performedBy: userId,
        eventType: "assigned",
        fromUserId: null,
        toUserId: userId,
      },
      client
    );

    await client.query("COMMIT");

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function assignTicketToUser(ticketId, userId, performedBy) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentTicketResult = await client.query(
      `
        SELECT
          id,
          assigned_to
        FROM tickets
        WHERE id = $1
        FOR UPDATE;
      `,
      [ticketId]
    );

    if (currentTicketResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const currentTicket = currentTicketResult.rows[0];

    const updatedResult = await client.query(
      `
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
      `,
      [userId, ticketId]
    );

    const eventType =
      currentTicket.assigned_to === null
        ? "assigned"
        : "reassigned";

    await ticketHistoryService.createHistoryEvent(
      {
        ticketId,
        performedBy,
        eventType,
        fromUserId: currentTicket.assigned_to,
        toUserId: userId,
      },
      client
    );

    await client.query("COMMIT");

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
  getTicketById,
  getAccessibleTicketById,
  getFilteredTickets,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  assignTicketToUser,
};