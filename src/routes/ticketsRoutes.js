const express = require("express");
const ticketsController = require("../controllers/ticketsController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.post("/", requireAuth, ticketsController.createTicket);

router.get("/", requireAuth, ticketsController.getTickets);

router.get("/:id", requireAuth, ticketsController.getTicketById);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("support", "manager"),
  ticketsController.updateTicketStatus
);

router.patch(
  "/:id/priority",
  requireAuth,
  requireRole("manager"),
  ticketsController.updateTicketPriority
);

router.patch(
  "/:id/assign",
  requireAuth,
  requireRole("support"),
  ticketsController.assignTicket
);

router.patch(
  "/:id/assign-user",
  requireAuth,
  requireRole("manager"),
  ticketsController.assignTicketToUser
);

module.exports = router;