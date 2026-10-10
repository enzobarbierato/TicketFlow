const ticketsService = require("../services/ticketsService");
const ticketHistoryService = require("../services/ticketHistoryService");

async function getTicketHistory(req, res) {
  try {
    const ticketId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    const ticket = await ticketsService.getAccessibleTicketById({
      ticketId,
      userId,
      userRole,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    const history =
      await ticketHistoryService.getTicketHistory(ticketId);

    return res.status(200).json({
      ticket: {
        id: ticket.id,
        title: ticket.title,
      },
      history,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  getTicketHistory,
};