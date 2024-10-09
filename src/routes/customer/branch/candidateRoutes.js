const express = require("express");
const router = express.Router();
const candidateController = require("../../../controllers/customer/branch/candidate/applicationController");
const cefRoutes = require("./candidate-email-form/cefRoutes.js");

const app = express();
app.use(cors());

// Basic routes
router.post("/create", candidateController.create);
router.get("/list", candidateController.list);
router.put("/update", candidateController.update);
router.delete("/delete", candidateController.delete);
router.delete("/", candidateController.delete);

app.use("/candidate-email-form", cefRoutes);

module.exports = router;
