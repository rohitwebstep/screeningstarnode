const express = require("express");
const router = express.Router();
const authController = require("../../../controllers/customer/branch/authController");
const profileController = require("../../../controllers/customer/branch/profileController");
const customerController = require("../../../controllers/customer/profileController");
const clientRoutes = require("./clientRoutes");
const subUserRoutes = require("./subUserRoutes");
const reportCaseStatusRoutes = require("./reportCaseStatusRoutes");
const candidateRoutes = require("./candidateRoutes");
const clientSpocController = require("../../../controllers/admin/clientSpocController");

// Basic routes
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.get("/client-spoc/list", clientSpocController.listByBranchAuth);
router.post("/forgot-password-request", authController.forgotPasswordRequest);
router.post("/forgot-password", authController.forgotPassword);

router.get("/", profileController.index);
router.post("/verify-branch-login", authController.validateLogin);
router.get("/list", profileController.list);
router.get(
  "/client-applications-filter-options",
  profileController.filterOptionsForClientApplications
);
router.get(
  "/candidate-applications-filter-options",
  profileController.filterOptionsForCandidateApplications
);
router.get("/is-email-used", profileController.isEmailUsed);
router.get(
  "/customer-info",
  customerController.customerBasicInfoWithBranchAuth
);
router.get("/client-spoc-info", profileController.getClientSpocById);
router.get("/list-by-customer", profileController.listByCustomerID);
router.put("/update", profileController.update);
router.put("/update-password", authController.updatePassword);
router.get("/active", profileController.active);
router.get("/inactive", profileController.inactive);

router.get("/service-info", profileController.getServiceById);
router.get("/annexure-by-service", profileController.annexureDataByServiceId);

router.delete("/delete", profileController.delete);

router.get("/notification", profileController.notifications);

router.use("/client-application", clientRoutes);
router.use("/sub-user", subUserRoutes);
router.use("/report-case-status", reportCaseStatusRoutes);
router.use("/candidate-application", candidateRoutes);
module.exports = router;
