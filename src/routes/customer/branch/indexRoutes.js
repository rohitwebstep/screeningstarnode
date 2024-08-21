const express = require("express");
const router = express.Router();
const branchController = require("../../../controllers/customer/branch/branchController");

// Basic routes
router.post("/create", branchController.create);

module.exports = router;
