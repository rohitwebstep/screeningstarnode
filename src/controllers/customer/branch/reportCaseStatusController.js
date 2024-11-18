const crypto = require("crypto");
const Branch = require("../../../models/customer/branch/branchModel");
const ClientMasterTrackerModel = require("../../../models/admin/clientMasterTrackerModel");
const BranchCommon = require("../../../models/customer/branch/commonModel");
const AdminCommon = require("../../../models/admin/commonModel");
const Service = require("../../../models/admin/serviceModel");
const reportCaseStatus = require("../../../models/customer/branch/reportCaseStatusModel");

exports.reportFormJsonByServiceID = (req, res) => {
  const { service_id, branch_id, _token } = req.query;

  let missingFields = [];
  if (
    !service_id ||
    service_id === "" ||
    service_id === undefined ||
    service_id === "undefined"
  )
    missingFields.push("Service ID");
  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  )
    missingFields.push("Admin ID");
  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  )
    missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ report_case_status: "view" });

  // Step 2: Check if the branch is authorized for the action
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message, // Return the authorization error message
      });
    }

    // Step 3: Verify the branch token
    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
      (tokenErr, tokenResult) => {
        if (tokenErr) {
          console.error("Error checking token validity:", tokenErr);
          return res.status(500).json({
            status: false,
            message: tokenErr,
          });
        }

        if (!tokenResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenResult.message, // Return the token validation message
          });
        }

        const newToken = tokenResult.newToken;

        reportCaseStatus.reportFormJsonByServiceID(
          service_id,
          (err, reportFormJson) => {
            if (err) {
              console.error(newFunction(), err);
              return res
                .status(500)
                .json({ status: false, message: err.message, token: newToken });
            }

            if (!reportFormJson) {
              return res.status(404).json({
                status: false,
                message: "Report form JSON not found",
                token: newToken,
              });
            }

            res.json({
              status: true,
              message: "Report form JSON fetched successfully",
              reportFormJson,
              token: newToken,
            });

            function newFunction() {
              return "Database error:";
            }
          }
        );
      }
    );
  });
};

exports.annexureData = (req, res) => {
  const { application_id, db_table, branch_id, _token } = req.query;

  let missingFields = [];
  if (
    !application_id ||
    application_id === "" ||
    application_id === undefined ||
    application_id === "undefined"
  )
    missingFields.push("Application ID");
  if (
    !db_table ||
    db_table === "" ||
    db_table === undefined ||
    db_table === "undefined"
  )
    missingFields.push("DB Table");
  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  )
    missingFields.push("Admin ID");
  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  )
    missingFields.push("Token");

  const modifiedDbTable = db_table.replace(/-/g, "_");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ report_case_status: "view" });

  // Step 2: Check if the branch is authorized for the action
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message, // Return the authorization error message
      });
    }

    // Step 3: Verify the branch token
    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
      (tokenErr, tokenResult) => {
        if (tokenErr) {
          console.error("Error checking token validity:", tokenErr);
          return res.status(500).json({
            status: false,
            message: tokenErr,
          });
        }

        if (!tokenResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenResult.message, // Return the token validation message
          });
        }

        const newToken = tokenResult.newToken;

        reportCaseStatus.annexureData(
          application_id,
          modifiedDbTable,
          (err, annexureData) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({
                status: false,
                message: "An error occurred while fetching annexure data.",
                error: err,
                token: newToken,
              });
            }

            if (!annexureData) {
              return res.status(404).json({
                status: false,
                message: "Annexure Data not found.",
                token: newToken,
              });
            }

            res.status(200).json({
              status: true,
              message: "Application fetched successfully 4.",
              annexureData,
              token: newToken,
            });
          }
        );
      }
    );
  });
};

exports.annexureData = (req, res) => {
  const { application_id, db_table, branch_id, _token } = req.query;

  let missingFields = [];
  if (
    !application_id ||
    application_id === "" ||
    application_id === undefined ||
    application_id === "undefined"
  )
    missingFields.push("Application ID");
  if (
    !db_table ||
    db_table === "" ||
    db_table === undefined ||
    db_table === "undefined"
  )
    missingFields.push("DB Table");
  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  )
    missingFields.push("Admin ID");
  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  )
    missingFields.push("Token");

  const modifiedDbTable = db_table.replace(/-/g, "_");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ report_case_status: "view" });

  // Step 2: Check if the branch is authorized for the action
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message, // Return the authorization error message
      });
    }

    // Step 3: Verify the branch token
    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
      (tokenErr, tokenResult) => {
        if (tokenErr) {
          console.error("Error checking token validity:", tokenErr);
          return res.status(500).json({
            status: false,
            message: tokenErr,
          });
        }

        if (!tokenResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenResult.message, // Return the token validation message
          });
        }

        const newToken = tokenResult.newToken;

        ClientMasterTrackerModel.applicationByID(
          application_id,
          branch_id,
          (err, application) => {
            if (err) {
              console.error("Database error:", err);
              return res
                .status(500)
                .json({ status: false, message: err.message, token: newToken });
            }

            if (!application) {
              return res.status(404).json({
                status: false,
                message: "Application not found",
                token: newToken,
              });
            }

            ClientMasterTrackerModel.getCMTApplicationById(
              application_id,
              (err, CMTApplicationData) => {
                if (err) {
                  console.error("Database error:", err);
                  return res.status(500).json({
                    status: false,
                    message: err.message,
                    token: newToken,
                  });
                }

                if (!CMTApplicationData) {
                  return res.json({
                    status: true,
                    message: "Application fetched successfully 1",
                    application,
                    token: newToken,
                  });
                } else {
                  return res.json({
                    status: true,
                    message: "Application fetched successfully 2",
                    application,
                    CMTData: CMTApplicationData,
                    token: newToken,
                  });
                }
              }
            );
          }
        );
      }
    );
  });
};
