const express = require("express");
const authController = require("../controllers/authController");
const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.post("/login", authController.login);
router.get("/me", requireAuth, authController.getCurrentUser);

module.exports = router;