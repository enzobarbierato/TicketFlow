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

module.exports = {
  getManagementSummary,
};