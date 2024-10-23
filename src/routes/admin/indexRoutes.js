const express = require("express");
const router = express.Router();
const authController = require("../../controllers/admin/authController");
const clientMasterTrackerRoutes = require("./clientMasterTrackerRoutes");

// Authentication routes
router.post("/login", authController.login);
router.put("/update-password", authController.updatePassword);
router.post("/forgot-password-request", authController.forgotPasswordRequest);
router.post("/forgot-password", authController.forgotPassword);
router.get("/logout", authController.logout);
router.post("/verify-admin-login", authController.validateLogin);
app.use("/client-master-tracker", clientMasterTrackerRoutes);

module.exports = router;
