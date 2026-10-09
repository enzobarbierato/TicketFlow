const express = require("express");
const categoriesController = require("../controllers/categoriesController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  categoriesController.getActiveCategories
);

module.exports = router;