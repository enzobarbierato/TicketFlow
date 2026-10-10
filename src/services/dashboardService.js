const pool = require("../database/connection");

async function getSupportDashboard(userId) {
  const query = `
    SELECT
      COUNT(*) FILTER (
        WHERE assigned_to IS NULL
          AND status = 'open'
      )::INTEGER AS available,

      COUNT(*) FILTER (
        WHERE assigned_to = $1
          AND status <> 'closed'
      )::INTEGER AS assigned_to_me,

      COUNT(*) FILTER (
        WHERE assigned_to = $1
          AND status = 'in_progress'
      )::INTEGER AS in_progress,

      COUNT(*) FILTER (
        WHERE assigned_to = $1
          AND status = 'waiting_user'
      )::INTEGER AS waiting_user,

      COUNT(*) FILTER (
        WHERE (
          assigned_to IS NULL
          OR assigned_to = $1
        )
        AND priority = 'critical'
        AND status <> 'closed'
      )::INTEGER AS critical,

      COUNT(*) FILTER (
        WHERE assigned_to = $1
          AND status = 'resolved'
      )::INTEGER AS resolved

    FROM tickets;
  `;

  const result = await pool.query(query, [userId]);

  return result.rows[0];
}

module.exports = {
  getSupportDashboard,
};