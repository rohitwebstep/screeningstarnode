 const express = require('express');
const router = express.Router();
const authController = require('../controllers/admin/authController');

// Authentication routes
router.post('/login', authController.login);

module.exports = router;
