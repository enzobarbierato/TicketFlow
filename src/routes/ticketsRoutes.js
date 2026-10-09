const express = require("express");
const ticketsController = require("../controllers/ticketsController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.post("/", requireAuth, ticketsController.createTicket);
router.get("/", requireAuth, ticketsController.getTickets);

module.exports = router;