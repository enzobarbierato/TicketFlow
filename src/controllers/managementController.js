const managementService = require("../services/managementService");

async function getSummary(req, res) {
  try {
    const summary = await managementService.getManagementSummary();

    return res.status(200).json({
      summary,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  getSummary,
};