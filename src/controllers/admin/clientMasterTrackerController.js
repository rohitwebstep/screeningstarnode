const crypto = require("crypto");
const ClientMasterTrackerModel = require("../../models/admin/clientMasterTrackerModel");
const Customer = require("../../models/customer/customerModel");
const ClientApplication = require("../../models/customer/branch/clientApplicationModel");
const Branch = require("../../models/customer/branch/branchModel");
const AdminCommon = require("../../models/admin/commonModel");
const BranchCommon = require("../../models/customer/branch/commonModel");
const {
  finalReportMail,
} = require("../../mailer/admin/client-master-tracker/finalReportMail");
const {
  qcReportCheckMail,
} = require("../../mailer/admin/client-master-tracker/qcReportCheckMail");
const {
  readyForReport,
} = require("../../mailer/admin/client-master-tracker/readyForReport");

const fs = require("fs");
const path = require("path");
const { upload, saveImage, saveImages } = require("../../utils/imageSave");

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
        if (key === "annexure") {
          isAnnexure = true;
          annexureResult = {};
        }
        recursiveFlatten(obj[key], isAnnexure);
        if (isAnnexure && key !== "annexure") {
          if (typeof obj[key] === "object" && obj[key] !== null) {
            annexureResult[key] = obj[key];
          }
        }
      } else {
        if (!isAnnexure) {
          result[key] = obj[key];
        }
      }
    }
  }

  recursiveFlatten(jsonObj);
  return { mainJson: result, annexureRawJson: annexureResult };
}

// Controller to list all customers
exports.list = (req, res) => {
  const { admin_id, _token, filter_status } = req.query;

  // Check for missing fields
  const missingFields = [];
  if (!admin_id) missingFields.push("Admin ID");
  if (!_token) missingFields.push("Token");

  // Return error if there are missing fields
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Action for admin authorization
  const action = JSON.stringify({ cmt_application: "view" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!tokenResult.status) {
        return res
          .status(401)
          .json({ status: false, message: tokenResult.message });
      }

      const newToken = tokenResult.newToken;

      // Fetch customer list with filter status
      ClientMasterTrackerModel.list(filter_status, (err, customerResults) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        // Respond with the fetched customer data
        return res.json({
          status: true,
          message: "Customers fetched successfully",
          customers: customerResults,
          totalResults: customerResults.length,
          token: newToken,
        });
      });
    });
  });
};

exports.test = (req, res) => {
  // Replace 1 with the appropriate client application ID you need to pass
  ClientMasterTrackerModel.getAttachmentsByClientAppID(2, (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        status: false,
        message: "Database error occurred",
      });
    }

    // If successful, return the result
    res.json({
      status: true,
      message: "Attachments fetched successfully",
      attachments: result,
      totalResults: result.length,
    });
  });
};

exports.listByCustomerId = (req, res) => {
  const { customer_id, filter_status, admin_id, _token } = req.query;

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

      ClientMasterTrackerModel.listByCustomerID(
        customer_id,
        filter_status,
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

exports.applicationListByBranch = (req, res) => {
  const { filter_status, branch_id, admin_id, _token, status } = req.query;

  let missingFields = [];
  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  )
    missingFields.push("Branch ID");
  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
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

      if (
        !status ||
        status === "" ||
        status === undefined ||
        status === "undefined"
      ) {
        let status = null;
      }

      ClientMasterTrackerModel.applicationListByBranch(
        filter_status,
        branch_id,
        status,
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
  if (
    !application_id ||
    application_id === "" ||
    application_id === undefined ||
    application_id === "undefined"
  )
    missingFields.push("Application ID");
  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  )
    missingFields.push("Branch ID");
  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
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

              Branch.getBranchById(branch_id, (err, currentBranch) => {
                if (err) {
                  console.error("Database error during branch retrieval:", err);
                  return res.status(500).json({
                    status: false,
                    message: "Failed to retrieve Branch. Please try again.",
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

                Customer.getCustomerById(
                  parseInt(currentBranch.customer_id),
                  (err, currentCustomer) => {
                    if (err) {
                      console.error(
                        "Database error during customer retrieval:",
                        err
                      );
                      return res.status(500).json({
                        status: false,
                        message:
                          "Failed to retrieve Customer. Please try again.",
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

                    if (!CMTApplicationData) {
                      return res.json({
                        status: true,
                        message: "Application fetched successfully 1",
                        application,
                        branchInfo: currentBranch,
                        customerInfo: currentCustomer,
                        token: newToken,
                      });
                    } else {
                      return res.json({
                        status: true,
                        message: "Application fetched successfully 2",
                        application,
                        CMTData: CMTApplicationData,
                        branchInfo: currentBranch,
                        customerInfo: currentCustomer,
                        token: newToken,
                      });
                    }
                  }
                );
              });
            }
          );
        }
      );
    });
  });
};

exports.annexureData = (req, res) => {
  const { application_id, db_table, admin_id, _token } = req.query;

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
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
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

      ClientMasterTrackerModel.annexureData(
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
    });
  });
};

exports.filterOptions = (req, res) => {
  const { admin_id, _token } = req.query;

  let missingFields = [];
  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
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

      ClientMasterTrackerModel.filterOptions((err, filterOptions) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            message: "An error occurred while fetching Filter options data.",
            error: err,
            token: newToken,
          });
        }

        if (!filterOptions) {
          return res.status(404).json({
            status: false,
            message: "Filter options Data not found.",
            token: newToken,
          });
        }

        res.status(200).json({
          status: true,
          message: "Filter options fetched successfully.",
          filterOptions,
          token: newToken,
        });
      });
    });
  });
};

exports.filterOptionsForBranch = (req, res) => {
  const { branch_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  ) {
    missingFields.push("Branch ID");
  }
  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
  ) {
    missingFields.push("Admin ID");
  }
  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  ) {
    missingFields.push("Token");
  }

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

      ClientMasterTrackerModel.filterOptionsForBranch(
        branch_id,
        (err, filterOptions) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              status: false,
              message: "An error occurred while fetching Filter options data.",
              error: err,
              token: newToken,
            });
          }

          if (!filterOptions) {
            return res.status(404).json({
              status: false,
              message: "Filter options Data not found.",
              token: newToken,
            });
          }

          res.status(200).json({
            status: true,
            message: "Filter options fetched successfully.",
            filterOptions,
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
  if (
    !service_id ||
    service_id === "" ||
    service_id === undefined ||
    service_id === "undefined"
  )
    missingFields.push("Service ID");
  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
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

exports.generateReport = async (req, res) => {
  const {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    updated_json,
    annexure,
    send_mail,
  } = req.body;

  const requiredFields = {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    updated_json,
  };
  const missingFields = Object.keys(requiredFields).filter(
    (field) => !requiredFields[field]
  );

  if (missingFields.length) {
    return res
      .status(400)
      .json({
        status: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
  }

  // Helper functions
  const logActivity = (status, message, logData, error = null) =>
    AdminCommon.adminActivityLog(
      admin_id,
      "admin/client-master-tracker",
      status,
      message,
      JSON.stringify(logData),
      error,
      () => {}
    );

  const handleAnnexurePromises = async (applicationId, annexureData) => {
    return Promise.allSettled(
      Object.keys(annexureData).map(async (key) => {
        const modifiedDbTable = key.replace(/-/g, "_");
        const subJson = annexureData[modifiedDbTable];
        // Simplified annexure handling (try/catch for each entry)
        try {
          const currentCMTAnnexure =
            await ClientMasterTrackerModel.getCMTAnnexureByApplicationId(
              applicationId,
              modifiedDbTable
            );
          const logStatus = currentCMTAnnexure ? "update" : "create";
          await ClientMasterTrackerModel.createOrUpdateAnnexure(
            applicationId,
            branch_id,
            customer_id,
            modifiedDbTable,
            subJson
          );
          logActivity(logStatus, "1", {
            application_id: applicationId,
            annexureData,
          });
        } catch (err) {
          console.error("Annexure handling error:", err);
          logActivity(
            "createOrUpdateAnnexureError",
            "0",
            { application_id: applicationId, annexureData },
            err
          );
        }
      })
    );
  };

  try {
    const action = JSON.stringify({ cmt_application: "generate_report" });
    const AuthResult = await AdminCommon.isAdminAuthorizedForAction(
      admin_id,
      action
    );
    if (!AuthResult.status)
      return res
        .status(403)
        .json({ status: false, message: AuthResult.message });

    const TokenResult = await AdminCommon.isAdminTokenValid(_token, admin_id);
    if (!TokenResult.status)
      return res
        .status(401)
        .json({ status: false, message: TokenResult.message });

    const newToken = TokenResult.newToken;
    const currentBranch = await Branch.getBranchById(branch_id);
    if (
      !currentBranch ||
      parseInt(currentBranch.customer_id) !== parseInt(customer_id)
    ) {
      return res
        .status(404)
        .json({
          status: false,
          message: "Branch not found or customer mismatch.",
          token: newToken,
        });
    }

    const currentCustomer = await Customer.getCustomerById(customer_id);
    if (!currentCustomer)
      return res
        .status(404)
        .json({
          status: false,
          message: "Customer not found.",
          token: newToken,
        });

    const currentCMTApplication =
      await ClientMasterTrackerModel.getCMTApplicationById(application_id);
    const { mainJson, annexureRawJson } = flattenJsonWithAnnexure(updated_json);

    const changes = {};
    let logStatus = "create";
    if (currentCMTApplication) {
      logStatus = "update";
      Object.keys(mainJson).forEach((key) => {
        if (currentCMTApplication[key] !== mainJson[key]) {
          changes[key] = {
            old: currentCMTApplication[key],
            new: mainJson[key],
          };
        }
      });
    }

    await ClientMasterTrackerModel.generateReport(
      mainJson,
      application_id,
      branch_id,
      customer_id
    );
    logActivity(logStatus, "1", { application_id, changes });

    if (annexure) await handleAnnexurePromises(application_id, annexure);

    const emailData =
      await BranchCommon.getBranchandCustomerEmailsForNotification(branch_id);
    const toArr = [
      { name: emailData.branch.name, email: emailData.branch.email },
    ];
    const ccArr = emailData.customer.emails
      .split(",")
      .map((email) => ({ name: emailData.customer.name, email: email.trim() }));

    const application = await ClientMasterTrackerModel.applicationByID(
      application_id,
      branch_id
    );
    const attachments =
      await ClientMasterTrackerModel.getAttachmentsByClientAppID(
        application_id
      );

    const responseMessage = `CMT Application ${
      currentCMTApplication ? "updated" : "created"
    } successfully`;
    return res
      .status(200)
      .json({ status: true, message: responseMessage, token: newToken });
  } catch (error) {
    console.error("Error in generateReport:", error);
    return res
      .status(500)
      .json({
        status: false,
        message: "An error occurred while generating the report.",
        error: error.message,
      });
  }
};

exports.customerBasicInfoWithAdminAuth = (req, res) => {
  const { customer_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (
    !customer_id ||
    customer_id === "" ||
    customer_id === undefined ||
    customer_id === "undefined"
  )
    missingFields.push("Customer ID");
  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
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

      Customer.basicInfoByID(customer_id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        res.json({
          status: true,
          message: "Customer Info fetched successfully",
          customers: result,
          token: newToken,
        });
      });
    });
  });
};

exports.annexureDataByServiceIdofApplication = (req, res) => {
  const { service_id, application_id, admin_id, _token } = req.query;

  let missingFields = [];
  if (
    !service_id ||
    service_id === "" ||
    service_id === undefined ||
    service_id === "undefined"
  ) {
    missingFields.push("Service ID");
  }

  if (
    !application_id ||
    application_id === "" ||
    application_id === undefined ||
    application_id === "undefined"
  ) {
    missingFields.push("Application ID");
  }

  if (
    !admin_id ||
    admin_id === "" ||
    admin_id === undefined ||
    admin_id === "undefined"
  ) {
    missingFields.push("Admin ID");
  }
  if (
    !_token ||
    _token === "" ||
    _token === undefined ||
    _token === "undefined"
  ) {
    missingFields.push("Token");
  }

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
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!tokenResult.status) {
        return res
          .status(401)
          .json({ status: false, message: tokenResult.message });
      }

      const newToken = tokenResult.newToken;

      ClientMasterTrackerModel.reportFormJsonByServiceID(
        service_id,
        (err, reportFormJson) => {
          if (err) {
            console.error("Error fetching report form JSON:", err);
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

          const parsedData = JSON.parse(reportFormJson.json);
          const db_table = parsedData.db_table;
          const heading = parsedData.heading;
          const modifiedDbTable = db_table.replace(/-/g, "_");

          ClientMasterTrackerModel.annexureData(
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
                message: "Application fetched successfully 5.",
                annexureData,
                heading,
                token: newToken,
              });
            }
          );
        }
      );
    });
  });
};

exports.upload = async (req, res) => {
  // Use multer to handle the upload
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        status: false,
        message: "Error uploading file.",
      });
    }

    const {
      admin_id: adminId,
      branch_id: branchId,
      _token: token,
      customer_code: customerCode,
      application_id: appId,
      application_code: appCode,
      db_table: dbTable,
      db_column: dbColumn,
      send_mail: sendMail,
      email_status: emailStatus,
    } = req.body;

    // Validate required fields and collect missing ones
    const requiredFields = {
      adminId,
      branchId,
      token,
      customerCode,
      appCode,
      appId,
      dbTable,
      dbColumn,
    };

    // Check for missing fields
    const missingFields = Object.keys(requiredFields)
      .filter(
        (field) =>
          !requiredFields[field] ||
          requiredFields[field] === "" ||
          requiredFields[field] == "undefined" ||
          requiredFields[field] == undefined
      )
      .map((field) => field.replace(/_/g, " "));

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (sendMail == 1 && !emailStatus) {
      console.warn("Email status required when sending mail");
      return res.status(400).json({
        status: false,
        message: "The field 'emailStatus' is required when sending an email.",
      });
    }

    const action = JSON.stringify({ cmt_application: "generate_report" });
    AdminCommon.isAdminAuthorizedForAction(adminId, action, (result) => {
      if (!result.status) {
        return res.status(403).json({
          status: false,
          message: result.message, // Return the message from the authorization function
        });
      }

      // Verify admin token
      AdminCommon.isAdminTokenValid(token, adminId, async (err, result) => {
        if (err) {
          console.error("Error checking token validity:", err);
          return res.status(500).json({ status: false, message: err.message });
        }

        if (!result.status) {
          return res
            .status(401)
            .json({ status: false, message: result.message });
        }

        const newToken = result.newToken;
        // Define the target directory for uploads
        const targetDirectory = `uploads/customer/${customerCode}/application/${appCode}/${dbTable}`;
        // Create the target directory for uploads
        await fs.promises.mkdir(targetDirectory, { recursive: true });

        let savedImagePaths = [];

        // Check for multiple files under the "images" field
        if (req.files.images) {
          savedImagePaths = await saveImages(req.files.images, targetDirectory);
        }

        // Check for a single file under the "image" field
        if (req.files.image && req.files.image.length > 0) {
          const savedImagePath = await saveImage(
            req.files.image[0],
            targetDirectory
          );
          savedImagePaths.push(savedImagePath);
        }

        // Call the model to upload images
        ClientMasterTrackerModel.upload(
          appId,
          dbTable,
          dbColumn,
          savedImagePaths,
          (success, result) => {
            if (!success) {
              console.error(
                "Upload failed:",
                result || "An error occurred while saving the image."
              );
              return res.status(500).json({
                status: false,
                message: result || "An error occurred while saving the image.",
                token: newToken,
                savedImagePaths,
              });
            }

            // Handle sending email notifications if required
            if (sendMail == 1) {
              BranchCommon.getBranchandCustomerEmailsForNotification(
                branchId,
                (emailError, emailData) => {
                  if (emailError) {
                    console.error("Error fetching emails:", emailError);
                    return res.status(500).json({
                      status: false,
                      message: "Failed to retrieve email addresses.",
                      token: newToken,
                      savedImagePaths,
                    });
                  }

                  const { branch, customer } = emailData;
                  const companyName = customer.name;

                  // Prepare recipient and CC lists
                  const toArr = [{ name: branch.name, email: branch.email }];
                  const ccArr = JSON.parse(customer.emails).map((email) => ({
                    name: customer.name,
                    email: email.trim(),
                  }));

                  ClientMasterTrackerModel.applicationByID(
                    appId,
                    branchId,
                    (err, application) => {
                      if (err) {
                        console.error("Database error:", err);
                        return res.status(500).json({
                          status: false,
                          message: err.message,
                          token: newToken,
                          savedImagePaths,
                        });
                      }

                      if (!application) {
                        console.warn("Application not found");
                        return res.status(404).json({
                          status: false,
                          message: "Application not found",
                          token: newToken,
                          savedImagePaths,
                        });
                      }

                      ClientMasterTrackerModel.getAttachmentsByClientAppID(
                        appId,
                        (err, attachments) => {
                          if (err) {
                            console.error(
                              "Database error while fetching attachments:",
                              err
                            );
                            return res.status(500).json({
                              status: false,
                              message: "Database error occurred",
                              token: newToken,
                              savedImagePaths,
                            });
                          }

                          const gender = application.gender?.toLowerCase();
                          const maritalStatus =
                            application.marital_status?.toLowerCase();

                          let genderTitle = "Mr.";
                          if (gender === "male") {
                            genderTitle = "Mr.";
                          } else if (gender === "female") {
                            genderTitle =
                              maritalStatus === "married" ? "Mrs." : "Ms.";
                          }

                          // Prepare and send email based on application status
                          // Final report email
                          if (emailStatus == 1) {
                            finalReportMail(
                              "cmt",
                              "final",
                              companyName,
                              genderTitle,
                              application.name,
                              application.application_id,
                              attachments,
                              toArr,
                              ccArr
                            )
                              .then(() => {
                                return res.status(200).json({
                                  status: true,
                                  message: "CMT Final Report mail sent.",
                                  token: newToken,
                                  savedImagePaths,
                                });
                              })
                              .catch((emailError) => {
                                console.error(
                                  "Error sending email for final report:",
                                  emailError
                                );
                                return res.status(200).json({
                                  status: true,
                                  message: "Failed to send CMT mail.",
                                  token: newToken,
                                  savedImagePaths,
                                });
                              });
                          }
                          // QC report email
                          else if (emailStatus == 2) {
                            qcReportCheckMail(
                              "cmt",
                              "qc",
                              genderTitle,
                              application.name,
                              application.application_id,
                              attachments,
                              toArr,
                              ccArr
                            )
                              .then(() => {
                                return res.status(200).json({
                                  status: true,
                                  message:
                                    "CMT Quality Check Report mail sent.",
                                  token: newToken,
                                  savedImagePaths,
                                });
                              })
                              .catch((emailError) => {
                                console.error(
                                  "Error sending email for QC report:",
                                  emailError
                                );
                                return res.status(200).json({
                                  status: true,
                                  message: "Failed to send CMT mail.",
                                  token: newToken,
                                  savedImagePaths,
                                });
                              });
                          }
                          // Handling for other statuses
                          else if (emailStatus == 3) {
                            readyForReport(
                              "cmt",
                              "ready",
                              application.application_id,
                              toArr,
                              ccArr
                            )
                              .then(() => {
                                return res.status(200).json({
                                  status: true,
                                  message: "Ready for Report mail sent.",
                                  token: newToken,
                                  savedImagePaths,
                                });
                              })
                              .catch((emailError) => {
                                console.error(
                                  "Error sending email for report:",
                                  emailError
                                );
                                return res.status(200).json({
                                  status: true,
                                  message: "Failed to send CMT mail.",
                                  token: newToken,
                                  savedImagePaths,
                                });
                              });
                          }
                          // Handle unknown email status
                          else {
                            return res.status(200).json({
                              status: true,
                              message: "Images uploaded successfully.",
                              token: newToken,
                              savedImagePaths,
                            });
                          }
                        }
                      );
                    }
                  );
                }
              );
            } else {
              return res.status(200).json({
                status: true,
                message: "Images uploaded successfully.",
                token: newToken,
                savedImagePaths,
              });
            }
          }
        );
      });
    });
  });
};
