const dashboardService = require("../services/dashboardService");

async function getDashboard(req, res) {
  try {
    const userId = req.session.user.id;

    const dashboard = await dashboardService.getSupportDashboard(userId);

    return res.status(200).json({
      dashboard,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  getDashboard,
};