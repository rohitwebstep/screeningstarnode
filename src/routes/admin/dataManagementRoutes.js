const express = require("express");
const router = express.Router();
const dataManagementController = require("../../controllers/admin/dataManagementController");

// Authentication routes
router.get("/", dataManagementController.index);
module.exports = router;
