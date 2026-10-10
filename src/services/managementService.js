const pool = require("../database/connection");

async function getManagementSummary() {
  const ticketsQuery = `
    SELECT
      COUNT(*)::INTEGER AS total,

      COUNT(*) FILTER (
        WHERE status = 'open'
      )::INTEGER AS open,

      COUNT(*) FILTER (
        WHERE status = 'in_progress'
      )::INTEGER AS in_progress,

      COUNT(*) FILTER (
        WHERE status = 'waiting_user'
      )::INTEGER AS waiting_user,

      COUNT(*) FILTER (
        WHERE status = 'resolved'
      )::INTEGER AS resolved,

      COUNT(*) FILTER (
        WHERE status = 'closed'
      )::INTEGER AS closed,

      COUNT(*) FILTER (
        WHERE assigned_to IS NULL
          AND status <> 'closed'
      )::INTEGER AS unassigned,

      COUNT(*) FILTER (
        WHERE priority = 'critical'
          AND status <> 'closed'
      )::INTEGER AS critical

    FROM tickets;
  `;

  const supportQuery = `
    SELECT
      COUNT(*)::INTEGER AS support_users
    FROM users
    WHERE role = 'support';
  `;

  const [ticketsResult, supportResult] = await Promise.all([
    pool.query(ticketsQuery),
    pool.query(supportQuery),
  ]);

  return {
    ...ticketsResult.rows[0],
    support_users: supportResult.rows[0].support_users,
  };
}

async function getTicketsByCategory() {
  const query = `
    SELECT
      c.id AS category_id,
      c.name AS category_name,

      COUNT(t.id)::INTEGER AS total,

      COUNT(t.id) FILTER (
        WHERE t.status = 'open'
      )::INTEGER AS open,

      COUNT(t.id) FILTER (
        WHERE t.status = 'in_progress'
      )::INTEGER AS in_progress,

      COUNT(t.id) FILTER (
        WHERE t.status = 'waiting_user'
      )::INTEGER AS waiting_user,

      COUNT(t.id) FILTER (
        WHERE t.status = 'resolved'
      )::INTEGER AS resolved,

      COUNT(t.id) FILTER (
        WHERE t.status = 'closed'
      )::INTEGER AS closed

    FROM categories c

    LEFT JOIN tickets t
      ON t.category_id = c.id

    GROUP BY
      c.id,
      c.name

    ORDER BY total DESC, c.name ASC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

async function getSupportSummary(userId) {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.department,
      u.job_title,

      COUNT(t.id)::INTEGER AS total,

      COUNT(t.id) FILTER (
        WHERE t.status = 'open'
      )::INTEGER AS open,

      COUNT(t.id) FILTER (
        WHERE t.status = 'in_progress'
      )::INTEGER AS in_progress,

      COUNT(t.id) FILTER (
        WHERE t.status = 'waiting_user'
      )::INTEGER AS waiting_user,

      COUNT(t.id) FILTER (
        WHERE t.status = 'resolved'
      )::INTEGER AS resolved,

      COUNT(t.id) FILTER (
        WHERE t.status = 'closed'
      )::INTEGER AS closed,

      COUNT(t.id) FILTER (
        WHERE t.priority = 'critical'
          AND t.status <> 'closed'
      )::INTEGER AS critical

    FROM users u

    LEFT JOIN tickets t
      ON t.assigned_to = u.id

    WHERE u.id = $1
      AND u.role = 'support'

    GROUP BY
      u.id,
      u.name,
      u.email,
      u.department,
      u.job_title;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0] || null;
}

async function getSupportStatistics() {
  const query = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.department,
      u.job_title,

      COUNT(t.id)::INTEGER AS total,

      COUNT(t.id) FILTER (
        WHERE t.status <> 'closed'
      )::INTEGER AS active,

      COUNT(t.id) FILTER (
        WHERE t.status = 'open'
      )::INTEGER AS open,

      COUNT(t.id) FILTER (
        WHERE t.status = 'in_progress'
      )::INTEGER AS in_progress,

      COUNT(t.id) FILTER (
        WHERE t.status = 'waiting_user'
      )::INTEGER AS waiting_user,

      COUNT(t.id) FILTER (
        WHERE t.status = 'resolved'
      )::INTEGER AS resolved,

      COUNT(t.id) FILTER (
        WHERE t.status = 'closed'
      )::INTEGER AS closed,

      COUNT(t.id) FILTER (
        WHERE t.priority = 'critical'
          AND t.status <> 'closed'
      )::INTEGER AS critical

    FROM users u

    LEFT JOIN tickets t
      ON t.assigned_to = u.id

    WHERE u.role = 'support'

    GROUP BY
      u.id,
      u.name,
      u.email,
      u.department,
      u.job_title

    ORDER BY
      active DESC,
      u.name ASC;
  `;

  const result = await pool.query(query);

  return result.rows;
}

async function getSupportTickets(userId) {
  const query = `
    SELECT
      t.id,
      t.title,
      t.category_id,
      c.name AS category_name,
      t.priority,
      t.status,
      t.created_by,
      creator.name AS created_by_name,
      t.assigned_to,
      t.created_on,
      t.updated_on,
      t.closed_on

    FROM tickets t

    INNER JOIN categories c
      ON c.id = t.category_id

    INNER JOIN users creator
      ON creator.id = t.created_by

    WHERE t.assigned_to = $1

    ORDER BY
      CASE t.status
        WHEN 'open' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'waiting_user' THEN 3
        WHEN 'resolved' THEN 4
        WHEN 'closed' THEN 5
      END,
      t.updated_on DESC;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows;
}

async function getSupportPerformanceMetrics(userId) {
  const query = `
    SELECT
      COUNT(DISTINCT h.ticket_id) FILTER (
        WHERE h.event_type IN ('assigned', 'reassigned')
          AND h.to_user_id = $1
      )::INTEGER AS tickets_received,

      COUNT(*) FILTER (
        WHERE h.event_type = 'assigned'
          AND h.to_user_id = $1
      )::INTEGER AS direct_assignments,

      COUNT(*) FILTER (
        WHERE h.event_type = 'reassigned'
          AND h.to_user_id = $1
      )::INTEGER AS reassigned_to,

      COUNT(*) FILTER (
        WHERE h.event_type = 'reassigned'
          AND h.from_user_id = $1
      )::INTEGER AS reassigned_from,

      COUNT(*) FILTER (
        WHERE h.event_type = 'status_changed'
          AND h.performed_by = $1
      )::INTEGER AS status_changes,

      COUNT(DISTINCT h.ticket_id) FILTER (
        WHERE h.event_type = 'status_changed'
          AND h.performed_by = $1
          AND h.new_value = 'resolved'
      )::INTEGER AS resolved_by_support,

      COUNT(DISTINCT h.ticket_id) FILTER (
        WHERE h.event_type = 'status_changed'
          AND h.performed_by = $1
          AND h.new_value = 'closed'
      )::INTEGER AS closed_by_support

    FROM ticket_history h;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0];
}

async function getSupportTimeMetrics(userId) {
  const query = `
    WITH self_assignments AS (
      SELECT
        assigned.ticket_id,
        assigned.created_on AS assigned_on,
        created.created_on AS created_on

      FROM ticket_history assigned

      INNER JOIN ticket_history created
        ON created.ticket_id = assigned.ticket_id
        AND created.event_type = 'created'

      WHERE assigned.event_type = 'assigned'
        AND assigned.to_user_id = $1
        AND assigned.performed_by = $1
    ),

    resolutions AS (
      SELECT
        resolved.ticket_id,
        resolved.created_on AS resolved_on,

        (
          SELECT MAX(received.created_on)
          FROM ticket_history received
          WHERE received.ticket_id = resolved.ticket_id
            AND received.event_type IN ('assigned', 'reassigned')
            AND received.to_user_id = $1
            AND received.created_on <= resolved.created_on
        ) AS received_on

      FROM ticket_history resolved

      WHERE resolved.event_type = 'status_changed'
        AND resolved.new_value = 'resolved'
        AND resolved.performed_by = $1
    )

    SELECT
      (
        SELECT ROUND(
          AVG(
            EXTRACT(
              EPOCH FROM (assigned_on - created_on)
            )
          )
        )::INTEGER
        FROM self_assignments
      ) AS avg_seconds_to_assign,

      (
        SELECT ROUND(
          AVG(
            EXTRACT(
              EPOCH FROM (resolved_on - received_on)
            )
          )
        )::INTEGER
        FROM resolutions
        WHERE received_on IS NOT NULL
      ) AS avg_seconds_to_resolve;
  `;

  const result = await pool.query(query, [userId]);

  return {
    avg_seconds_to_assign:
      result.rows[0].avg_seconds_to_assign ?? null,

    avg_seconds_to_resolve:
      result.rows[0].avg_seconds_to_resolve ?? null,
  };
}

module.exports = {
  getManagementSummary,
  getTicketsByCategory,
  getSupportSummary,
  getSupportStatistics,
  getSupportTickets,
  getSupportPerformanceMetrics,
  getSupportTimeMetrics,
};