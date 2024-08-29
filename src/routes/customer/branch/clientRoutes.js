const express = require("express");
const router = express.Router();
const clientController = require("../../../controllers/customer/branch/clientController");

// Basic routes
router.post("/create", clientController.create);

module.exports = router;
