const express = require("express");
const categoriesController = require("../controllers/categoriesController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole("manager"),
  categoriesController.createCategory
);

router.get(
  "/",
  requireAuth,
  categoriesController.getActiveCategories
);

module.exports = router;