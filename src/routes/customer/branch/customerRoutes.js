const express = require("express");
const router = express.Router();
const customerController = require("../../../controllers/customer/branch/customer/applicationController");

// Basic routes
router.post("/create", customerController.create);
router.get("/list", customerController.list);
router.put("/update", customerController.update);
router.delete("/delete", customerController.delete);

module.exports = router;
