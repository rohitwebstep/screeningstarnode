 const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

// Authentication routes
router.post('/add', packageController.newPackage);
router.get('/list', packageController.list);

module.exports = router;
