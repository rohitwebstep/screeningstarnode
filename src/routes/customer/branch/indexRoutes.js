const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/customer/branch/authController");
const profileController = require("../../../controllers/customer/branch/profileController");
const customerController = require("../../../controllers/customer/profileController");
const clientRoutes = require("./clientRoutes");
const candidateRoutes = require("./candidateRoutes");

// Basic routes
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.post("/verify-branch-login", authController.validateLogin);
router.get("/list", profileController.list);
router.get("/is-email-used", profileController.isEmailUsed);
router.get(
  "/customer-info",
  customerController.customerBasicInfoWithBranchAuth
);
router.get("/list-by-customer", profileController.listByCustomerID);
router.put("/update", profileController.update);
router.put("/update-password", authController.updatePassword);
router.get("/active", profileController.active);
router.get("/inactive", profileController.inactive);

router.delete("/delete", profileController.delete);

router.use("/client-application", clientRoutes);
router.use("/candidate-application", candidateRoutes);
module.exports = router;
