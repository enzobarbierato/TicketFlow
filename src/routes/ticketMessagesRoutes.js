const express = require("express");
const ticketMessagesController = require("../controllers/ticketMessagesController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.post(
  "/:ticketId/messages",
  requireAuth,
  ticketMessagesController.createMessage
);

router.get(
  "/:ticketId/messages",
  requireAuth,
  ticketMessagesController.getMessages
);

module.exports = router;