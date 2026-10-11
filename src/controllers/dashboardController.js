const dashboardService = require("../services/dashboardService");

async function getDashboard(req, res, next) {
  try {
    const userId = req.session.user.id;

    const dashboard = await dashboardService.getSupportDashboard(userId);

    return res.status(200).json({
      dashboard,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
};