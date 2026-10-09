const express = require("express");
const ticketMessagesController = require("../controllers/ticketMessagesController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.post(
  "/:ticketId/messages",
  requireAuth,
  ticketMessagesController.createMessage
);

module.exports = router;