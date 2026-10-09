const ticketsService = require("../services/ticketsService");

async function createTicket(req, res) {
  try {
    const {
      title,
      description,
      category,
      priority,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        message: "Título, descrição e categoria são obrigatórios.",
      });
    }

    const ticket = await ticketsService.createTicket({
      title,
      description,
      category,
      priority,
      created_by: req.session.user.id,
    });

    return res.status(201).json({
      message: "Chamado criado com sucesso.",
      ticket,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function getTickets(req, res) {
  try {
    const userId = req.session.user.id;

    const tickets = await ticketsService.getTicketsByUserId(userId);

    return res.status(200).json({
      tickets,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

module.exports = {
  createTicket,
  getTickets,
};