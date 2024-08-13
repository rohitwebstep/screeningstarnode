 const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

// Authentication routes
router.post('/add', batchController.newBatch);

module.exports = router;
