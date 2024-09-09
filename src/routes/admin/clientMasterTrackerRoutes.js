const express = require('express');
const router = express.Router();
const clientMasterTrackerController = require('../../controllers/admin/clientMasterTrackerController');

// Authentication routes
router.get('/list', clientMasterTrackerController.list);
router.get('/list-by-customer-id', clientMasterTrackerController.listByCustomerId);

module.exports = router;
