const express = require("express");
const router = express.Router();
const clientSpocController = require("../../controllers/admin/clientSpocController");

// Authentication routes
router.post("/create", clientSpocController.create);
router.get("/list", clientSpocController.list);
router.get(
  "/client-spoc-info",
  clientSpocController.getClientSpocById
);
router.put("/update", clientSpocController.update);
router.delete("/delete", clientSpocController.delete);

module.exports = router;
