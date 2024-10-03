const express = require("express");
const router = express.Router();
const authController = require("../../controllers/admin/authController");

// Authentication routes
router.post("/login", authController.login);
router.put("/update-password", authController.updatePassword);
router.get("/logout", authController.logout);
router.post("/verify-admin-login", authController.validateLogin);

module.exports = router;
