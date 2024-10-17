const express = require("express");
const router = express.Router();
const acknowledgementController = require("../../controllers/admin/acknowledgementController");

// Authentication routes
router.get("/list", acknowledgementController.list);
router.put("/send-notification", acknowledgementController.sendNotification);

module.exports = router;
