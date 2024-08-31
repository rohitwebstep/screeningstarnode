const express = require("express");
const router = express.Router();
const clientController = require("../../../controllers/customer/branch/client/applicationController");

// Basic routes
router.post("/create", clientController.create);
router.get("/list", clientController.list);

module.exports = router;
