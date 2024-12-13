const express = require("express");
const router = express.Router();
const invoiceMasterController = require("../../controllers/admin/invoiceMasterController");

// Authentication routes
router.get("/send-data", invoiceMasterController.sendData);
router.get("/update", invoiceMasterController.update);
router.get("/", invoiceMasterController.list);

module.exports = router;
