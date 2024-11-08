const express = require("express");
const router = express.Router();
const billingSpocController = require("../../controllers/admin/billingSpocController");

// Authentication routes
router.post("/create", billingSpocController.create);
router.get("/list", billingSpocController.list);
router.get("/spoc-info", billingSpocController.getBillingSpocById);
router.put("/update", billingSpocController.update);
router.delete("/delete", billingSpocController.delete);

module.exports = router;
