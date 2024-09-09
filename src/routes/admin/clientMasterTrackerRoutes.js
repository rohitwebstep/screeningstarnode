const express = require('express');
const router = express.Router();
const clientMasterTrackerController = require('../../controllers/admin/clientMasterTrackerController');

// Authentication routes
router.get('/', clientMasterTrackerController.index);

module.exports = router;
