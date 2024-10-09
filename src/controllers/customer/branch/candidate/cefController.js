const Candidate = require("../../../../models/customer/branch/candidateApplicationModel");
const BranchCommon = require("../../../../models/customer/branch/commonModel");
const CEF = require("../../../../models/customer/branch/cefModel");
const Service = require("../../../../models/admin/serviceModel");

exports.formJson = (req, res) => {
  const { service_id } = req.query;

  let missingFields = [];
  if (!service_id) missingFields.push("Service ID");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  CEF.formJson(service_id, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        status: false,
        message: "An error occurred while fetching service form json.",
      });
    }

    res.json({
      status: true,
      message: "Service form json fetched successfully.",
      formJson: result,
      totalResults: result.length,
    });
  });
};
