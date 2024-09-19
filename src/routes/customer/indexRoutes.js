const express = require("express");
const router = express.Router();
const profileController = require("../../controllers/customer/profileController");

// Profile routes
router.post("/create", profileController.create);
router.get("/list", profileController.list);
router.put("/update", profileController.update);
router.get("/active", profileController.active);
router.get("/inactive", profileController.inactive);
router.delete("/delete", profileController.delete);

module.exports = router;
