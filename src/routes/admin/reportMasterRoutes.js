const express = require("express");
const router = express.Router();
const reportMasterController = require("../../controllers/admin/reportMasterController");

// Authentication routes
router.get("/application-status", reportMasterController.applicationStatus);
router.get("/report-generation", reportMasterController.reportGeneration);
module.exports = router;
