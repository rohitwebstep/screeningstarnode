const express = require('express');
const router = express.Router();
const clientMasterTrackerController = require('../../controllers/admin/clientMasterTrackerController');

// Authentication routes
router.get('/list', clientMasterTrackerController.list);
router.get('/branch-list-by-customer', clientMasterTrackerController.listByCustomerId);
router.get('/applications-by-branch', clientMasterTrackerController.applicationListByBranch);
router.get('/application-by-id', clientMasterTrackerController.applicationByID);
router.get('/report-form-json-by-service-id', clientMasterTrackerController.reportFormJsonByServiceID);

module.exports = router;
