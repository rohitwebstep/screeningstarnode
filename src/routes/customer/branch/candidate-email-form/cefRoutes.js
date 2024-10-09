const express = require("express");
const router = express.Router();
const cefController = require("../../../../controllers/customer/branch/candidate/cefController");

// Basic routes
router.get("/service-form-json", cefController.formJson);
router.get("/is-application-exist", cefController.isApplicationExist);
router.put("/submit", cefController.submit);


module.exports = router;
