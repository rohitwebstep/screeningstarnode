 const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController');

// Authentication routes
router.post('/login', authController.login);
router.post('/verify-login', authController.ValidateLogin);

module.exports = router;
