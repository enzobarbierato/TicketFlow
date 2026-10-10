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

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("manager"),
  categoriesController.updateCategoryStatus
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("manager"),
  categoriesController.updateCategoryName
);

module.exports = router;