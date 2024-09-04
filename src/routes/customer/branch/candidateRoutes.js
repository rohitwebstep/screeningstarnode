const express = require("express");
const router = express.Router();
const candidateController = require("../../../controllers/customer/branch/candidate/applicationController");

// Basic routes
router.post("/create", candidateController.create);
router.get("/list", candidateController.list);
router.put("/update", candidateController.update);
router.delete("/delete", candidateController.delete);

module.exports = router;
