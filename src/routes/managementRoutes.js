const express = require("express");
const managementController = require("../controllers/managementController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validateIdParam = require("../middlewares/validateIdParam");

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  requireRole("manager"),
  managementController.getSummary
);

router.get(
  "/categories",
  requireAuth,
  requireRole("manager"),
  managementController.getTicketsByCategory
);

router.get(
  "/support/:id",
  requireAuth,
  validateIdParam("id"),
  requireRole("manager"),
  managementController.getSupportSummary
);

router.get(
  "/support",
  requireAuth,
  requireRole("manager"),
  managementController.getSupportStatistics
);

module.exports = router;