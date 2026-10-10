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

module.exports = {
  getManagementSummary,
  getTicketsByCategory,
  getSupportSummary,
  getSupportStatistics,
  getSupportTickets,
};