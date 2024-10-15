const express = require("express");
const router = express.Router();
const acknowledgementController = require("../../controllers/admin/acknowledgementController");

// Authentication routes
router.get("/list", acknowledgementController.list);

module.exports = router;
