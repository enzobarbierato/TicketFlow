const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("support"),
  dashboardController.getDashboard
);

module.exports = router;