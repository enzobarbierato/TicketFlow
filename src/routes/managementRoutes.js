const express = require("express");
const managementController = require("../controllers/managementController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  requireRole("manager"),
  managementController.getSummary
);

module.exports = router;