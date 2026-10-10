const express = require("express");
const ticketMessagesController = require("../controllers/ticketMessagesController");
const requireAuth = require("../middlewares/requireAuth");
const validateIdParam = require("../middlewares/validateIdParam");

const router = express.Router();

router.post(
  "/:ticketId/messages",
  requireAuth,
  validateIdParam("ticketId"),
  ticketMessagesController.createMessage
);

router.get(
  "/:ticketId/messages",
  requireAuth,
  validateIdParam("ticketId"),
  ticketMessagesController.getMessages
);

module.exports = router;