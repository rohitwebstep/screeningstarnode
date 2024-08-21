const express = require("express");
const router = express.Router();
const authController = require("../../controllers/customer/authController");
const profileController = require("../../controllers/customer/profileController");

// Authentication routes
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/verify-admin-login", authController.validateLogin);

// Profile routes
router.post("/create", profileController.create);

module.exports = router;
