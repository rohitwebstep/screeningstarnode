const express = require('express');
const router = express.Router();
const authController = require('../../controllers/customer/authController');

// Authentication routes
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/verify-customer-login', authController.validateLogin);

module.exports = router;
