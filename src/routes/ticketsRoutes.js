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

module.exports = router;