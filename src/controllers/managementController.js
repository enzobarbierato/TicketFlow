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

async function getTicketsByCategory(req, res) {
  try {
    const categories = await managementService.getTicketsByCategory();

    return res.status(200).json({
      categories,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function getSupportSummary(req, res) {
  try {
    const support = await managementService.getSupportSummary(req.params.id);

    if (!support) {
      return res.status(404).json({
        message: "Funcionário de suporte não encontrado.",
      });
    }

    return res.status(200).json({
      support,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function getSupportStatistics(req, res) {
  try {
    const support = await managementService.getSupportStatistics();

    return res.status(200).json({
      support,
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
  getTicketsByCategory,
  getSupportSummary,
  getSupportStatistics,
};