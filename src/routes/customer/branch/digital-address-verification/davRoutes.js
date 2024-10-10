const express = require("express");
const router = express.Router();
const davController = require("../../../../controllers/customer/branch/candidate/davController");

// Basic routes
router.get("/is-application-exist", davController.isApplicationExist);
router.put("/submit", davController.submit);

module.exports = router;
