const express = require("express");
const router = express.Router();
const reportCaseStatusController = require("../../../controllers/customer/branch/reportCaseStatusController");

// Basic routes
router.get("/annexure-data", clientMasterTrackerController.annexureData);
router.get(
    "/report-form-json-by-service-id",
    reportCaseStatusController.reportFormJsonByServiceID
  );
module.exports = router;
