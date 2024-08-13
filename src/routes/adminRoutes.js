 const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController');
const serviceController = require('../controllers/serviceController');

// Authentication routes
router.post('/login', authController.login);

// Service routes
router.get('/services', serviceController.getServices);

module.exports = router;
