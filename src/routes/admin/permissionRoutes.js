const express = require("express");
const router = express.Router();
const permissionController = require("../../controllers/admin/permissionController");

// Basic routes
router.get("/roles", permissionController.rolesList);

module.exports = router;
