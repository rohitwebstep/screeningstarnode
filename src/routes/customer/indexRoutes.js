const express = require("express");
const router = express.Router();
const profileController = require("../../controllers/customer/profileController");

// Profile routes
router.post("/create", profileController.create);
router.get("/list", profileController.list);
router.delete("/delete", profileController.delete);

module.exports = router;
