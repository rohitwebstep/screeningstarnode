const express = require("express");
const router = express.Router();
const clientController = require("../../../controllers/customer/branch/client/applicationController");

// Basic routes
router.post("/create", clientController.create);
router.get("/list", clientController.list);
router.get("/application-info", clientController.applicationByID);
router.put("/update", clientController.update);
router.delete("/delete", clientController.delete);

module.exports = router;
