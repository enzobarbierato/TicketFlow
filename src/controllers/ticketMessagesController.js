const ticketsService = require("../services/ticketsService");
const ticketMessagesService = require("../services/ticketMessagesService");

async function createMessage(req, res) {
  try {
    const ticketId = req.params.ticketId;
    const userId = req.session.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        message: "A mensagem é obrigatória.",
      });
    }

    const ticket = await ticketsService.getTicketByIdAndUserId(
      ticketId,
      userId
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    const ticketMessage = await ticketMessagesService.createMessage({
      ticketId,
      userId,
      message,
    });

    return res.status(201).json({
      message: "Mensagem adicionada com sucesso.",
      ticketMessage,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  createMessage,
};