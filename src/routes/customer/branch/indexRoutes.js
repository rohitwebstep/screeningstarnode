const express = require("express");
const router = express.Router();
const branchController = require("../../../controllers/customer/branch/branchController");
const authController = require("../../../controllers/customer/branch/authController");

// Basic routes
router.post('/login', authController.login);

module.exports = router;
