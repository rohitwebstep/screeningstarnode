const express = require('express');
const router = express.Router();
const externalLoginCredentialsController = require('../../controllers/admin/externalLoginCredentialsController');

// Authentication Routes
router.get('/list', externalLoginCredentialsController.list);

module.exports = router;
