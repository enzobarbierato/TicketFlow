const express = require("express");
const ticketsController = require("../controllers/ticketsController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validateIdParam = require("../middlewares/validateIdParam");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  ticketsController.createTicket
);

router.get(
  "/",
  requireAuth,
  ticketsController.getTickets
);

router.get(
  "/:id",
  requireAuth,
  validateIdParam("id"),
  ticketsController.getTicketById
);

router.patch(
  "/:id/status",
  requireAuth,
  validateIdParam("id"),
  requireRole("support", "manager"),
  ticketsController.updateTicketStatus
);

router.patch(
  "/:id/priority",
  requireAuth,
  validateIdParam("id"),
  requireRole("manager"),
  ticketsController.updateTicketPriority
);

router.patch(
  "/:id/assign",
  requireAuth,
  validateIdParam("id"),
  requireRole("support"),
  ticketsController.assignTicket
);

router.patch(
  "/:id/assign-user",
  requireAuth,
  validateIdParam("id"),
  requireRole("manager"),
  ticketsController.assignTicketToUser
);

module.exports = router;