const crypto = require("crypto");
const Branch = require("../../../models/customer/branch/branchModel");
const ClientMasterTrackerModel = require("../../../models/admin/clientMasterTrackerModel");
const BranchCommon = require("../../../models/customer/branch/commonModel");
const AdminCommon = require("../../../models/admin/commonModel");
const Service = require("../../../models/admin/serviceModel");
const reportCaseStatus = require("../../../models/customer/branch/reportCaseStatusModel");

exports.list = (req, res) => {
  const { branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!branch_id || branch_id.trim() === "" || branch_id === "undefined") {
    missingFields.push("Branch ID");
  }
  if (!_token || _token.trim() === "" || _token === "undefined") {
    missingFields.push("Token");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ report_case_status: "view" });

  // Check branch authorization for the action
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message,
      });
    }

    // Verify branch token
    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
      (tokenErr, tokenResult) => {
        if (tokenErr) {
          console.error("Error checking token validity:", tokenErr);
          return res.status(500).json({
            status: false,
            message: "An internal error occurred while validating the token.",
          });
        }

        if (!tokenResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenResult.message,
          });
        }

        const newToken = tokenResult.newToken;

        // Fetch application data
        let filter_status;
        let status;
        ClientMasterTrackerModel.applicationListByBranch(
          filter_status || "",
          branch_id,
          status || "",
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({
                status: false,
                message: "An internal error occurred while fetching data.",
                token: newToken,
              });
            }

            res.json({
              status: true,
              message: "Applications fetched successfully.",
              applications: result,
              totalResults: result.length,
              token: newToken,
            });
          }
        );
      }
    );
  });
};

exports.annexureDataByServiceIds = (req, res) => {
  const { service_ids, application_id, branch_id, _token } = req.query;
  let missingFields = [];
  if (!service_ids || service_ids === "" || service_ids === "undefined") {
    missingFields.push("Service ID");
  }
  if (
    !application_id ||
    application_id === "" ||
    application_id === "undefined"
  ) {
    missingFields.push("Application ID");
  }
  if (!branch_id || branch_id === "" || branch_id === "undefined") {
    missingFields.push("Branch ID");
  }
  if (!_token || _token === "" || _token === "undefined") {
    missingFields.push("Token");
  }

  if (missingFields.length > 0) {
    console.error("Missing required fields:", missingFields);
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ report_case_status: "view" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message,
      });
    }

    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
      (tokenErr, tokenResult) => {
        if (tokenErr) {
          console.error("Error checking token validity:", tokenErr);
          return res.status(500).json({
            status: false,
            message: "An internal error occurred while validating the token.",
          });
        }

        if (!tokenResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenResult.message,
          });
        }

        const newToken = tokenResult.newToken;
        const serviceIds = service_ids.split(",").map((id) => id.trim());
        const annexureResults = [];
        let pendingRequests = serviceIds.length;

        if (pendingRequests === 0) {
          // No service IDs provided, return immediately.
          return res.status(200).json({
            status: true,
            message: "No service IDs to process.",
            results: annexureResults,
            token: newToken,
          });
        }

        serviceIds.forEach((id) => {
          ClientMasterTrackerModel.reportFormJsonByServiceID(
            id,
            (err, reportFormJson) => {
              if (err) {
                console.error(
                  `Error fetching report form JSON for service ID ${id}:`,
                  err
                );
                annexureResults.push({
                  service_id: id,
                  serviceStatus: false,
                  message: err.message,
                });
                finalizeRequest();
                return;
              }

              if (!reportFormJson) {
                console.warn(`Report form JSON not found for service ID ${id}`);
                annexureResults.push({
                  service_id: id,
                  serviceStatus: false,
                  message: "Report form JSON not found",
                });
                finalizeRequest();
                return;
              }

              const parsedData = JSON.parse(reportFormJson.json);
              const db_table = parsedData.db_table.replace(/-/g, "_"); // Modify table name
              const heading = parsedData.heading;

              ClientMasterTrackerModel.annexureData(
                application_id,
                db_table,
                (err, annexureData) => {
                  if (err) {
                    console.error(
                      `Error fetching annexure data for service ID ${id}:`,
                      err
                    );
                    annexureResults.push({
                      service_id: id,
                      annexureStatus: false,
                      annexureData: null,
                      serviceStatus: true,
                      reportFormJson,
                      message:
                        "An error occurred while fetching annexure data.",
                      error: err,
                    });
                  } else if (!annexureData) {
                    console.warn(
                      `Annexure data not found for service ID ${id}`
                    );
                    annexureResults.push({
                      service_id: id,
                      annexureStatus: false,
                      annexureData: null,
                      serviceStatus: true,
                      reportFormJson,
                      message: "Annexure Data not found.",
                    });
                  } else {
                    annexureResults.push({
                      service_id: id,
                      annexureStatus: true,
                      serviceStatus: true,
                      reportFormJson,
                      annexureData,
                      heading,
                    });
                  }
                  finalizeRequest();
                }
              );
            }
          );
        });

        function finalizeRequest() {
          pendingRequests -= 1;
          console.log(`Pending requests: ${pendingRequests}`);
          if (pendingRequests === 0) {
            console.log({
              status: true,
              message: "Applications fetched successfully.",
              results: annexureResults,
              token: newToken,
            });
            return res.status(200).json({
              status: true,
              message: "Applications fetched successfully.",
              results: annexureResults,
              token: newToken,
            });
          }
        }
      }
    );
  });
};
