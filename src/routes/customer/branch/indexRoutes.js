const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/customer/branch/authController");
const profileController = require("../../../controllers/customer/branch/profileController");
const customerController = require("../../../controllers/customer/profileController");
const clientRoutes = require("./clientRoutes");

// Basic routes
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.get("/list", profileController.list);
router.get("/is-email-used", profileController.isEmailUsed);
router.get("/customer-info",customerController.customerBasicInfoWithBranchAuth);
router.get("/list-by-customer", profileController.listByCustomerID);
router.put("/update", profileController.update);
router.delete("/delete", profileController.delete);

router.use("/client-application", clientRoutes);
module.exports = router;
