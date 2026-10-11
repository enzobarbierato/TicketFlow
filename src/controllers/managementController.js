const managementService = require("../services/managementService");

async function getSummary(req, res, next) {
  try {
    const summary = await managementService.getManagementSummary();

    return res.status(200).json({
      summary,
    });
  } catch (error) {
    next(error);
  }
}

async function getTicketsByCategory(req, res, next) {
  try {
    const categories = await managementService.getTicketsByCategory();

    return res.status(200).json({
      categories,
    });
  } catch (error) {
    next(error);
  }
}

async function getSupportSummary(req, res, next) {
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
    next(error);
  }
}

async function getSupportStatistics(req, res, next) {
  try {
    const support = await managementService.getSupportStatistics();

    return res.status(200).json({
      support,
    });
  } catch (error) {
    next(error);
  }
}

async function getSupportTickets(req, res, next) {
  try {
    const support = await managementService.getSupportSummary(req.params.id);

    if (!support) {
      return res.status(404).json({
        message: "Funcionário de suporte não encontrado.",
      });
    }

    const tickets = await managementService.getSupportTickets(req.params.id);

    return res.status(200).json({
      support: {
        id: support.id,
        name: support.name,
      },
      tickets,
    });
  } catch (error) {
    next(error);
  }
}

async function getSupportPerformanceMetrics(req, res, next) {
  try {
    const support = await managementService.getSupportSummary(req.params.id);

    if (!support) {
      return res.status(404).json({
        message: "Funcionário de suporte não encontrado.",
      });
    }

    const performanceMetrics =
      await managementService.getSupportPerformanceMetrics(req.params.id);

    const timeMetrics =
      await managementService.getSupportTimeMetrics(req.params.id);

    return res.status(200).json({
      support: {
        id: support.id,
        name: support.name,
        email: support.email,
        department: support.department,
        job_title: support.job_title,
      },

      metrics: {
        ...performanceMetrics,
        ...timeMetrics,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getTicketsByCategory,
  getSupportSummary,
  getSupportStatistics,
  getSupportTickets,
  getSupportPerformanceMetrics,
};