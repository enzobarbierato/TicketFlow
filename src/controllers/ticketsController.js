const ticketsService = require("../services/ticketsService");
const usersService = require("../services/usersService");

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
    const userRole = req.session.user.role;

    let tickets;

    if (userRole === "manager") {
      tickets = await ticketsService.getAllTickets();
    } else if (userRole === "support") {
      tickets = await ticketsService.getTicketsForSupport(userId);
    } else {
      tickets = await ticketsService.getTicketsByUserId(userId);
    }

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

async function getTicketById(req, res) {
  try {
    const ticketId = req.params.id;
    const userId = req.session.user.id;

    const ticket = await ticketsService.getTicketByIdAndUserId(
      ticketId,
      userId
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    return res.status(200).json({
      ticket,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function updateTicketStatus(req, res) {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = [
      "open",
      "in_progress",
      "waiting_user",
      "resolved",
      "closed",
    ];

    if (!status) {
      return res.status(400).json({
        message: "O status é obrigatório.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status inválido.",
      });
    }

    const ticket = await ticketsService.updateTicketStatus(
      ticketId,
      status
    );

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    return res.status(200).json({
      message: "Status do chamado atualizado com sucesso.",
      ticket,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function assignTicket(req, res) {
  try {
    const ticketId = req.params.id;
    const userId = req.session.user.id;

    const ticket = await ticketsService.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    if (ticket.assigned_to) {
      return res.status(409).json({
        message: "Este chamado já possui um responsável.",
      });
    }

    const assignedTicket = await ticketsService.assignTicket(
      ticketId,
      userId
    );

    if (!assignedTicket) {
      return res.status(409).json({
        message: "Não foi possível assumir o chamado.",
      });
    }

    return res.status(200).json({
      message: "Chamado atribuído com sucesso.",
      ticket: assignedTicket,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
}

async function assignTicketToUser(req, res) {
  try {
    const ticketId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "O usuário responsável é obrigatório.",
      });
    }

    const ticket = await ticketsService.getTicketById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    const supportUser = await usersService.getUserById(userId);

    if (!supportUser) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    if (supportUser.role !== "support") {
      return res.status(400).json({
        message: "O chamado só pode ser atribuído a um usuário de suporte.",
      });
    }

    const assignedTicket = await ticketsService.assignTicketToUser(
      ticketId,
      userId
    );

    return res.status(200).json({
      message: "Chamado atribuído ao suporte com sucesso.",
      ticket: assignedTicket,
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
  getTicketById,
  updateTicketStatus,
  assignTicket,
  assignTicketToUser,
};