const express = require("express");
const router = express.Router();
const cefController = require("../../../../controllers/customer/branch/candidate/cefController");

// Basic routes
router.get("/form-json", cefController.formJson);

module.exports = router;
