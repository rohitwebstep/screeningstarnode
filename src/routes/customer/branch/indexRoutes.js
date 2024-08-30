const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/customer/branch/authController");
const profileController = require("../../../controllers/customer/branch/profileController");
const clientRoutes = require("./clientRoutes");

// Basic routes
router.post("/login", authController.login);
router.get("/list", profileController.list);
router.get("/list-by-customer", profileController.listByCustomerID);
router.get("/logout", authController.logout);
router.delete("/delete", profileController.delete);

router.use("/client-application", clientRoutes);
module.exports = router;
