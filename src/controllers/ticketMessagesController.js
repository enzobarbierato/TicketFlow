const ticketsService = require("../services/ticketsService");
const ticketMessagesService = require("../services/ticketMessagesService");
const { isNonEmptyString } = require("../utils/validators");

async function createMessage(req, res) {
  try {
    const ticketId = req.params.ticketId;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const { message } = req.body;

    if (!isNonEmptyString(message)) {
      return res.status(400).json({
        message: "A mensagem é obrigatória.",
      });
    }

    const normalizedMessage = message.trim();

    if (normalizedMessage.length > 5000) {
      return res.status(400).json({
        message: "A mensagem deve ter no máximo 5000 caracteres.",
      });
    }

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

    if (ticket.status === "closed") {
      return res.status(409).json({
        message: "Não é possível enviar mensagens em um chamado fechado.",
      });
    }

    const ticketMessage = await ticketMessagesService.createMessage({
      ticketId,
      userId,
      message: normalizedMessage,
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

async function getMessages(req, res) {
  try {
    const ticketId = req.params.ticketId;
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

    const messages = await ticketMessagesService.getMessagesByTicketId(
      ticketId
    );

    return res.status(200).json({
      messages,
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
  getMessages,
};