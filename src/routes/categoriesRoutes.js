const express = require("express");
const categoriesController = require("../controllers/categoriesController");
const requireAuth = require("../middlewares/requireAuth");
const requireRole = require("../middlewares/requireRole");
const validateIdParam = require("../middlewares/validateIdParam");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  categoriesController.getActiveCategories
);

router.post(
  "/",
  requireAuth,
  requireRole("manager"),
  categoriesController.createCategory
);

router.patch(
  "/:id/status",
  requireAuth,
  validateIdParam("id"),
  requireRole("manager"),
  categoriesController.updateCategoryStatus
);

router.patch(
  "/:id",
  requireAuth,
  validateIdParam("id"),
  requireRole("manager"),
  categoriesController.updateCategoryName
);

module.exports = router;