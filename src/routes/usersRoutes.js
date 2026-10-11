const express = require("express");
const usersController = require("../controllers/usersController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole("manager"),
  usersController.createUser
);

router.get(
  "/support",
  requireAuth,
  requireRole("manager"),
  usersController.getSupportUsers
);

module.exports = router;