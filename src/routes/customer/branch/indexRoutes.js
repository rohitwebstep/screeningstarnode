const express = require("express");
const router = express.Router();
const branchController = require("../../../controllers/customer/branch/branchController");
const authController = require("../../../controllers/customer/branch/authController");
const clientRoutes = require("./clientRoutes");

// Basic routes
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.use("/client-application", clientRoutes);
module.exports = router;
