const crypto = require("crypto");
const ClientMasterTrackerModel = require("../../models/admin/clientMasterTrackerModel");
const Customer = require("../../models/customer/customerModel");
const Branch = require("../../models/customer/branch/branchModel");
const AdminCommon = require("../../models/admin/commonModel");
const BranchCommon = require("../../models/customer/branch/commonModel");
const { sendEmail } = require("../../mailer/customerMailer");

// Controller to list all customers
exports.list = (req, res) => {
  const { admin_id, _token } = req.query;

  let missingFields = [];
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ cmt_application: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      ClientMasterTrackerModel.list((err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Customers fetched successfully",
          customers: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.listByCustomerId = (req, res) => {
  const { customer_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!customer_id || customer_id === "") missingFields.push("Customer ID");
  if (!admin_id || admin_id === "") missingFields.push("Admin ID");
  if (!_token || _token === "") missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ cmt_application: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      ClientMasterTrackerModel.listByCustomerID(customer_id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Branches tracker fetched successfully",
          customers: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.applicationListByBranch = (req, res) => {
  const { branch_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!branch_id || branch_id === "" || branch_id === undefined)
    missingFields.push("Branch ID");
  if (!admin_id || admin_id === "" || admin_id === undefined)
    missingFields.push("Admin ID");
  if (!_token || _token === "" || _token === undefined)
    missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ cmt_application: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      ClientMasterTrackerModel.applicationListByBranch(
        branch_id,
        (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return res
              .status(500)
              .json({ status: false, message: err.message, token: newToken });
          }

          res.json({
            status: true,
            message: "Branches tracker fetched successfully",
            customers: result,
            totalResults: result.length,
            token: newToken,
          });
        }
      );
    });
  });
};

exports.applicationByID = (req, res) => {
  const { application_id, branch_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!application_id || application_id === "" || application_id === undefined)
    missingFields.push("Application ID");
  if (!branch_id || branch_id === "" || branch_id === undefined)
    missingFields.push("Branch ID");
  if (!admin_id || admin_id === "" || admin_id === undefined)
    missingFields.push("Admin ID");
  if (!_token || _token === "" || _token === undefined)
    missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ cmt_application: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

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

          res.json({
            status: true,
            message: "Application fetched successfully",
            application,
            token: newToken,
          });
        }
      );
    });
  });
};

exports.reportFormJsonByServiceID = (req, res) => {
  const { service_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (!service_id || service_id === "" || service_id === undefined)
    missingFields.push("Service ID");
  if (!admin_id || admin_id === "" || admin_id === undefined)
    missingFields.push("Admin ID");
  if (!_token || _token === "" || _token === undefined)
    missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ cmt_application: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      ClientMasterTrackerModel.reportFormJsonByServiceID(
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
    });
  });
};

exports.update = (req, res) => {
  const { admin_id, _token, customer_id, branch_id, application_id } = req.body;

  // Define required fields
  const requiredFields = {
    admin_id,
    _token,
    customer_id,
    branch_id,
    application_id,
  };

  // Check for missing fields
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field] || requiredFields[field] === "")
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Original JSON object
  let updatedJson = {
    month_year: "October 2024",
    initiation_date: "2024-09-25",
    organization_name: "Tech Corp Ltd",
    verification_purpose: "Employment Verification",
    employee_id: "E123456",
    client_code: "CLT987654",
    applicant_name: "John Doe",
    contact_number: "+1-555-1234",
    contact_number2: "+1-555-5678",
    father_name: "Michael Doe",
    dob: "1985-06-15",
    gender: "Male",
    marital_status: "Married",
    nationality: "American",
    insuff: "None",
    address: {
      address: "123 Main Street",
      landmark: "Near City Park",
      residence_mobile_number: "+1-555-9876",
      state: "California",
    },
    permanent_address: {
      permanent_address: "789 Elm Street",
      permanent_sender_name: "John Doe",
      permanent_receiver_name: "Mary Doe",
      permanent_landmark: "Opposite Central Mall",
      permanent_pin_code: "90210",
      permanent_state: "California",
    },
    insuffDetails: {
      first_insufficiency_marks: "Documents incomplete",
      first_insuff_date: "2024-09-30",
      first_insuff_reopened_date: "2024-10-01",
      second_insufficiency_marks: "",
      second_insuff_date: "",
      second_insuff_reopened_date: "",
      third_insufficiency_marks: "",
      third_insuff_date: "",
      third_insuff_reopened_date: "",
      overall_status: "In Progress",
      report_date: "2024-10-10",
      report_status: "Pending",
      report_type: "Background Check",
      final_verification_status: "Not Verified",
      is_verify: "No",
      deadline_date: "2024-10-20",
      insuff_address: "123 Main Street, California",
      basic_entry: "Completed",
      education: "Bachelor's Degree in Computer Science",
      case_upload: "Uploaded",
      emp_spoc: "Jane Smith",
      report_generate_by: "Tech Verifier Team",
      qc_done_by: "Alan Williams",
      delay_reason: "Awaiting additional documents",
    },
    annexure: {
      annexure_key_1: "Value 1",
      annexure_key_2: "Value 2",
    },
  };

  // Function to flatten JSON and separate annexure
  function flattenJsonWithAnnexure(jsonObj) {
    let result = {};
    let annexureResult = {};

    function recursiveFlatten(obj, isAnnexure = false) {
      for (let key in obj) {
        if (
          typeof obj[key] === "object" &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          // If it's an object, and key is not 'annexure', flatten it recursively
          if (key === "annexure") {
            recursiveFlatten(obj[key], true); // Separate annexure section
          } else {
            recursiveFlatten(obj[key], isAnnexure); // Normal flattening
          }
        } else {
          if (isAnnexure) {
            annexureResult[key] = obj[key]; // If it's part of annexure, store in annexure result
          } else {
            result[key] = obj[key]; // Else store in the main result
          }
        }
      }
    }

    recursiveFlatten(jsonObj);
    return { mainJson: result, annexureJson: annexureResult };
  }

  const action = JSON.stringify({ cmt_application: "update" });

  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message,
      });
    }

    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;
      Branch.getBranchById(branch_id, (err, currentBranch) => {
        if (err) {
          console.error("Database error during branch retrieval:", err);
          return res.status(500).json({
            status: false,
            message: "Failed to retrieve BranchModel. Please try again.",
            token: newToken,
          });
        }

        if (!currentBranch) {
          return res.status(404).json({
            status: false,
            message: "Branch not found.",
            token: newToken,
          });
        }

        if (parseInt(currentBranch.customer_id) !== parseInt(customer_id)) {
          return res.status(404).json({
            status: false,
            message: "Branch not found with customer match.",
            branch: currentBranch,
            token: newToken,
          });
        }

        Customer.getCustomerById(customer_id, (err, currentCustomer) => {
          if (err) {
            console.error("Database error during customer retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Customer. Please try again.",
              token: newToken,
            });
          }

          if (!currentCustomer) {
            return res.status(404).json({
              status: false,
              message: "Customer not found.",
              token: newToken,
            });
          }

          ClientMasterTrackerModel.getCMTApplicationById(
            application_id,
            (err, currentCMTApplication) => {
              if (err) {
                console.error(
                  "Database error during CMT Application retrieval:",
                  err
                );
                return res.status(500).json({
                  status: false,
                  message:
                    "Failed to retrieve CMT Application. Please try again.",
                  token: newToken,
                });
              }

              if (!currentCMTApplication) {
                return res.status(404).json({
                  status: false,
                  message: "CMT Application not found.",
                  token: newToken,
                });
              }

              const changes = {};
              const compareAndAddChanges = (key, newValue) => {
                if (currentCMTApplication[key] !== newValue) {
                  changes[key] = {
                    old: currentCMTApplication[key],
                    new: newValue,
                  };
                }
              };

              // Flatten the updatedJson object and separate annexure
              let { mainJson, annexureJson } =
                flattenJsonWithAnnexure(updatedJson);

              // Compare and log changes
              Object.keys(mainJson).forEach((key) =>
                compareAndAddChanges(key, mainJson[key])
              );

              ClientMasterTrackerModel.update(
                mainJson,
                application_id,
                (err, result) => {
                  if (err) {
                    console.error(
                      "Database error during CMT application update:",
                      err
                    );

                    AdminCommon.adminActivityLog(
                      admin_id,
                      "Client Master Tracker",
                      "Update",
                      "0",
                      JSON.stringify({ application_id, ...changes }),
                      err.message,
                      () => {}
                    );
                    return res.status(500).json({
                      status: false,
                      message: err.message,
                      token: newToken,
                    });
                  }

                  AdminCommon.adminActivityLog(
                    admin_id,
                    "Client Master Tracker",
                    "Update",
                    "1",
                    JSON.stringify({ application_id, ...changes }),
                    err.message,
                    () => {}
                  );

                  res.status(200).json({
                    status: true,
                    message: "CMT Application updated successfully.",
                    package: result,
                    token: newToken,
                  });
                }
              );
            }
          );
        });
      });
    });
  });
};
