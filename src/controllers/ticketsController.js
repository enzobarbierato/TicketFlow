const ticketsService = require("../services/ticketsService");
const usersService = require("../services/usersService");
const categoriesService = require("../services/categoriesService");
const ticketStatusService = require("../services/ticketStatusService");
const {isNonEmptyString,isPositiveInteger,} = require("../utils/validators");
const {TICKET_STATUSES,TICKET_PRIORITIES,} = require("../constants/ticketConstants");

async function createTicket(req, res, next) {
  try {
    const {
      title,
      description,
      category_id,
      priority,
    } = req.body;

    const created_by = req.session.user.id;

    if (!isNonEmptyString(title)) {
      return res.status(400).json({
        message: "O título é obrigatório.",
      });
    }

    if (!isNonEmptyString(description)) {
      return res.status(400).json({
        message: "A descrição é obrigatória.",
      });
    }

    if (!isPositiveInteger(category_id)) {
      return res.status(400).json({
        message: "Categoria inválida.",
      });
    }

    if (
      priority &&
      !TICKET_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        message: "Prioridade inválida.",
      });
    }

    const category =
      await categoriesService.getCategoryById(category_id);

    if (!category) {
      return res.status(404).json({
        message: "Categoria não encontrada.",
      });
    }

    if (!category.active) {
      return res.status(400).json({
        message: "Esta categoria está desativada.",
      });
    }

    const ticket = await ticketsService.createTicket({
      title: title.trim(),
      description: description.trim(),
      category_id,
      priority,
      created_by,
    });

    return res.status(201).json({
      message: "Chamado criado com sucesso.",
      ticket,
    });
  } catch (error) {
      return next(error);
  }
}

async function getTickets(req, res, next) {
  try {
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    const {
      status,
      priority,
      category_id,
      search,
      page = "1",
      limit = "10",
    } = req.query;

    if (status && !TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Filtro de status inválido.",
      });
    }
    
    if (priority && !TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: "Filtro de prioridade inválido.",
      });
    }

    if (
      category_id &&
      (!/^\d+$/.test(category_id) || Number(category_id) <= 0)
    ) {
      return res.status(400).json({
        message: "Filtro de categoria inválido.",
      });
    }

    if (!/^\d+$/.test(page) || Number(page) <= 0) {
      return res.status(400).json({
        message: "Página inválida.",
      });
    }

    if (
      !/^\d+$/.test(limit) ||
      Number(limit) <= 0 ||
      Number(limit) > 100
    ) {
      return res.status(400).json({
        message: "Limite inválido. Utilize um valor entre 1 e 100.",
      });
    }

    const currentPage = Number(page);
    const currentLimit = Number(limit);

    const result = await ticketsService.getFilteredTickets({
      userId,
      userRole,
      status,
      priority,
      categoryId: category_id,
      search: search?.trim() || undefined,
      page: currentPage,
      limit: currentLimit,
    });

    const totalPages = Math.ceil(result.total / currentLimit);

    return res.status(200).json({
      tickets: result.tickets,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total: result.total,
        total_pages: totalPages,
      },
    });
  } catch (error) {
      return next(error);
  }
}

async function updateTicketStatus(req, res, next) {
  try {
    const ticketId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "O status é obrigatório.",
      });
    }

    if (!TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Status inválido.",
      });
    }

    const currentTicket = await ticketsService.getAccessibleTicketById({
      ticketId,
      userId,
      userRole,
    });

    if (!currentTicket) {
      return res.status(404).json({
        message: "Chamado não encontrado ou sem permissão para alteração.",
      });
    }

    const canTransition = ticketStatusService.canTransitionStatus(
      currentTicket.status,
      status
    );

    if (!canTransition) {
      return res.status(400).json({
        message: `Não é permitido alterar o status de ${currentTicket.status} para ${status}.`,
      });
    }

    const ticket = await ticketsService.updateTicketStatus({
      ticketId,
      status,
      userId,
      userRole,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Chamado não encontrado ou sem permissão para alteração.",
      });
    }

    return res.status(200).json({
      message: "Status do chamado atualizado com sucesso.",
      ticket,
    });
  } catch (error) {
      return next(error);
  }
}

async function getTicketById(req, res, next) {
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

    return res.status(200).json({
      ticket,
    });
  } catch (error) {
      return next(error);
  }
}

async function assignTicket(req, res, next) {
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
      return next(error);
  }
}

async function assignTicketToUser(req, res, next) {
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

    if (
      ticket.assigned_to !== null &&
      String(ticket.assigned_to) === String(userId)
    ) {
      return res.status(409).json({
        message: "Este chamado já está atribuído a este funcionário.",
      });
    }

    const assignedTicket = await ticketsService.assignTicketToUser(
      ticketId,
      userId,
      req.session.user.id
    );

    return res.status(200).json({
      message: "Chamado atribuído ao suporte com sucesso.",
      ticket: assignedTicket,
    });
  } catch (error) {
  return next(error);
}
}

async function updateTicketPriority(req, res, next) {
  try {
    const ticketId = req.params.id;
    const { priority } = req.body;

    if (!TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: "Prioridade inválida.",
      });
    }

    if (!priority) {
      return res.status(400).json({
        message: "A prioridade é obrigatória.",
      });
    }

    if (
      priority &&
      !TICKET_PRIORITIES.includes(priority)
    ) {
      return res.status(400).json({
        message: "Prioridade inválida.",
      });
    }

    const result = await ticketsService.updateTicketPriority(
      ticketId,
      priority,
      req.session.user.id
    );

    if (!result) {
      return res.status(404).json({
        message: "Chamado não encontrado.",
      });
    }

    if (result.unchanged) {
      return res.status(409).json({
        message: "O chamado já possui esta prioridade.",
      });
    }

    return res.status(200).json({
      message: "Prioridade do chamado atualizada com sucesso.",
      ticket: result.ticket,
    });
  } catch (error) {
  return next(error);
}
}

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
  assignTicketToUser,
};