const express = require("express");
const router = express.Router();
const profileController = require("../../controllers/customer/profileController");
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Profile routes
router.post("/create", profileController.create);
router.post("/upload/custom-logo", upload.array('images'), profileController.uploadCustomLogo);
// router.post("/upload/custom-logo", profileController.uploadCustomLogo);
router.get("/list", profileController.list);
router.get("/inactive-list", profileController.inactiveList);
router.put("/update", profileController.update);
router.get("/fetch-branch-password", profileController.fetchBranchPassword);
router.get("/active", profileController.active);
router.get("/inactive", profileController.inactive);
router.delete("/delete", profileController.delete);

module.exports = router;
