const crypto = require("crypto");
const ClientMasterTrackerModel = require("../../models/admin/clientMasterTrackerModel");
const Customer = require("../../models/customer/customerModel");
const Branch = require("../../models/customer/branch/branchModel");
const AdminCommon = require("../../models/admin/commonModel");
const BranchCommon = require("../../models/customer/branch/commonModel");
const {
  finalReportMail,
} = require("../../mailer/client master tracker/finalReportMail");
const {
  qcReportCheckMail,
} = require("../../mailer/client master tracker/qcReportCheckMail");
const {
  readyForReport,
} = require("../../mailer/client master tracker/readyForReport");

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
  const { branch_id, admin_id, _token, status } = req.query;

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

          ClientMasterTrackerModel.getCMTApplicationIDByClientApplicationId(
            application_id,
            (err, CMTApplicationID) => {
              if (err) {
                console.error("Database error:", err);
                return res.status(500).json({
                  status: false,
                  message: err.message,
                  token: newToken,
                });
              }

              if (!CMTApplicationID) {
                return res.json({
                  status: true,
                  message: "Application fetched successfully",
                  application,
                  token: newToken,
                });
              }

              ClientMasterTrackerModel.getCMTApplicationById(
                CMTApplicationID,
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
                      message: "Application fetched successfully",
                      application,
                      token: newToken,
                    });
                  }

                  return res.json({
                    status: true,
                    message: "Application fetched successfully",
                    application,
                    CMTData: CMTApplicationData,
                    token: newToken,
                  });
                }
              );
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
              error: err.message,
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
            message: "Application fetched successfully.",
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
            error: err.message,
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

exports.generateReport = (req, res) => {
  const {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    updated_json,
    annexure,
  } = req.body;

  // Define required fields
  const requiredFields = {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    updated_json,
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

  const action = JSON.stringify({ cmt_application: "generate_report" });

  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (AuthResult) => {
    if (!AuthResult.status) {
      return res.status(403).json({
        status: false,
        message: AuthResult.message,
      });
    }

    AdminCommon.isAdminTokenValid(_token, admin_id, (err, TokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!TokenResult.status) {
        return res
          .status(401)
          .json({ status: false, message: TokenResult.message });
      }

      const newToken = TokenResult.newToken;
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

              // Flatten the updated_json object and separate annexure
              let { mainJson, annexureRawJson } =
                flattenJsonWithAnnexure(updated_json);

              // Declare changes outside the conditional block
              const changes = {};
              let logStatus = "create";
              if (
                currentCMTApplication &&
                Object.keys(currentCMTApplication).length > 0
              ) {
                logStatus = "update";
                const compareAndAddChanges = (key, newValue) => {
                  if (currentCMTApplication[key] !== newValue) {
                    changes[key] = {
                      old: currentCMTApplication[key],
                      new: newValue,
                    };
                  }
                };

                // Compare and log changes
                Object.keys(mainJson).forEach((key) =>
                  compareAndAddChanges(key, mainJson[key])
                );
              }

              ClientMasterTrackerModel.generateReport(
                mainJson,
                application_id,
                branch_id,
                customer_id,
                (err, cmtResult) => {
                  if (err) {
                    console.error(
                      "Database error during CMT application update:",
                      err
                    );

                    const logData =
                      currentCMTApplication &&
                      Object.keys(currentCMTApplication).length > 0
                        ? JSON.stringify({ application_id, ...changes }) // changes is defined here
                        : JSON.stringify(mainJson);

                    AdminCommon.adminActivityLog(
                      admin_id,
                      "Client Master Tracker",
                      logStatus,
                      "0",
                      logData,
                      err,
                      () => {}
                    );

                    return res.status(500).json({
                      status: false,
                      message: err,
                      token: newToken,
                    });
                  }

                  const logDataSuccess =
                    currentCMTApplication &&
                    Object.keys(currentCMTApplication).length > 0
                      ? JSON.stringify({ application_id, ...changes }) // changes is defined here
                      : JSON.stringify(mainJson);

                  AdminCommon.adminActivityLog(
                    admin_id,
                    "Client Master Tracker",
                    logStatus,
                    "1",
                    logDataSuccess,
                    err,
                    () => {}
                  );

                  if (typeof annexure === "object" && annexure !== null) {
                    const annexurePromises = [];

                    for (let key in annexure) {
                      const db_table = key ?? null;
                      const modifiedDbTable = db_table.replace(/-/g, "_");
                      const subJson = annexure[modifiedDbTable] ?? null;

                      const annexurePromise = new Promise((resolve, reject) => {
                        ClientMasterTrackerModel.getCMTAnnexureByApplicationId(
                          application_id,
                          modifiedDbTable,
                          (err, currentCMTAnnexure) => {
                            if (err) {
                              console.error(
                                "Database error during CMT Annexure retrieval:",
                                err
                              );
                              return reject(err); // Reject the promise on error
                            }

                            let annexureLogStatus =
                              currentCMTAnnexure &&
                              Object.keys(currentCMTAnnexure).length > 0
                                ? "update"
                                : "create";

                            if (logStatus == "update") {
                              cmt_id = currentCMTApplication.id;
                            } else if (logStatus == "create") {
                              cmt_id = cmtResult.insertId;
                            }

                            ClientMasterTrackerModel.createOrUpdateAnnexure(
                              cmt_id,
                              application_id,
                              branch_id,
                              customer_id,
                              modifiedDbTable,
                              subJson,
                              (err, annexureResult) => {
                                if (err) {
                                  console.error(
                                    "Database error during CMT annexure create or update:",
                                    err
                                  );

                                  const annexureLogData =
                                    currentCMTAnnexure &&
                                    Object.keys(currentCMTAnnexure).length > 0
                                      ? JSON.stringify({
                                          application_id,
                                          ...changes,
                                        })
                                      : JSON.stringify(mainJson);

                                  AdminCommon.adminActivityLog(
                                    admin_id,
                                    "Client Master Tracker",
                                    annexureLogStatus,
                                    "0",
                                    annexureLogData,
                                    err,
                                    () => {}
                                  );

                                  return reject(err); // Reject the promise on error
                                }

                                AdminCommon.adminActivityLog(
                                  admin_id,
                                  "Client Master Tracker",
                                  annexureLogStatus,
                                  "1",
                                  logDataSuccess,
                                  err,
                                  () => {}
                                );

                                resolve(); // Resolve the promise when successful
                              }
                            );
                          }
                        );
                      });

                      annexurePromises.push(annexurePromise); // Add the promise to the array
                    }

                    // Wait for all annexure operations to complete
                    Promise.all(annexurePromises)
                      .then(() => {
                        BranchCommon.getBranchandCustomerEmailsForNotification(
                          branch_id,
                          (emailError, emailData) => {
                            if (emailError) {
                              console.error(
                                "Error fetching emails:",
                                emailError
                              );
                              return res.status(500).json({
                                status: false,
                                message: "Failed to retrieve email addresses.",
                                token: newToken,
                              });
                            }

                            const { branch, customer } = emailData;
                            const company_name = customer.name;

                            // Prepare recipient and CC lists
                            const toArr = [
                              { name: branch.name, email: branch.email },
                            ];
                            const ccArr = customer.emails
                              .split(",")
                              .map((email) => ({
                                name: customer.name,
                                email: email.trim(),
                              }));

                            ClientMasterTrackerModel.applicationByID(
                              application_id,
                              branch_id,
                              (err, application) => {
                                if (err) {
                                  console.error("Database error:", err);
                                  return res.status(500).json({
                                    status: false,
                                    message: err.message,
                                    token: newToken,
                                  });
                                }

                                if (!application) {
                                  return res.status(404).json({
                                    status: false,
                                    message: "Application not found",
                                    token: newToken,
                                  });
                                }

                                if (
                                  mainJson.overall_status &&
                                  mainJson.is_verify
                                ) {
                                  const status =
                                    mainJson.overall_status.toLowerCase();
                                  const verified =
                                    mainJson.is_verify.toLowerCase();

                                  const gender = mainJson.gender?.toLowerCase();
                                  const marital_status =
                                    mainJson.marital_status?.toLowerCase();

                                  let gender_title = "Mx.";

                                  if (gender === "male") {
                                    gender_title = "Mr.";
                                  } else if (gender === "female") {
                                    gender_title =
                                      marital_status === "married"
                                        ? "Mrs."
                                        : "Ms.";
                                  }

                                  if (
                                    status === "completed" ||
                                    status === "complete"
                                  ) {
                                    if (verified === "yes") {
                                      // Send email notification
                                      finalReportMail(
                                        "cmt",
                                        "final",
                                        company_name,
                                        gender_title,
                                        application.name,
                                        application.application_id,
                                        toArr,
                                        ccArr
                                      )
                                        .then(() => {
                                          console.log(
                                            "Send Mail for Final Report"
                                          );

                                          return res.status(200).json({
                                            status: true,
                                            message: `CMT Application ${
                                              currentCMTApplication &&
                                              Object.keys(currentCMTApplication)
                                                .length > 0
                                                ? "updated"
                                                : "created"
                                            } successfully and mail sent.`,
                                            token: newToken,
                                          });
                                        })
                                        .catch((emailError) => {
                                          console.error(
                                            "Error sending email:",
                                            emailError
                                          );

                                          return res.status(200).json({
                                            status: true,
                                            message: `CMT Application ${
                                              currentCMTApplication &&
                                              Object.keys(currentCMTApplication)
                                                .length > 0
                                                ? "updated"
                                                : "created"
                                            } successfully but failed to send mail.`,
                                            token: newToken,
                                          });
                                        });
                                    } else if (verified === "no") {
                                      qcReportCheckMail(
                                        "cmt",
                                        "qc",
                                        gender_title,
                                        application.name,
                                        application.application_id,
                                        toArr,
                                        ccArr
                                      )
                                        .then(() => {
                                          console.log(
                                            "Send Mail for Report For Quality Check"
                                          );

                                          return res.status(200).json({
                                            status: true,
                                            message: `CMT Application ${
                                              currentCMTApplication &&
                                              Object.keys(currentCMTApplication)
                                                .length > 0
                                                ? "updated"
                                                : "created"
                                            } successfully and mail sent.`,
                                            token: newToken,
                                          });
                                        })
                                        .catch((emailError) => {
                                          console.error(
                                            "Error sending email:",
                                            emailError
                                          );

                                          return res.status(200).json({
                                            status: true,
                                            message: `CMT Application ${
                                              currentCMTApplication &&
                                              Object.keys(currentCMTApplication)
                                                .length > 0
                                                ? "updated"
                                                : "created"
                                            } successfully but failed to send mail.`,
                                            token: newToken,
                                          });
                                        });
                                    } else {
                                      return res.status(200).json({
                                        status: true,
                                        message: `CMT Application ${
                                          currentCMTApplication &&
                                          Object.keys(currentCMTApplication)
                                            .length > 0
                                            ? "updated"
                                            : "created"
                                        } successfully.`,
                                        token: newToken,
                                      });
                                    }
                                  } else {
                                    const completeStatusArr = [
                                      "completed",
                                      "completed_green",
                                      "completed_red",
                                      "completed_yellow",
                                      "completed_pink",
                                      "completed_orange",
                                    ];

                                    let allMatch = true;

                                    // Loop through the annexure object
                                    for (let key in annexure) {
                                      const db_table = key ?? null;
                                      const modifiedDbTable = db_table.replace(
                                        /-/g,
                                        "_"
                                      );
                                      const subJson =
                                        annexure[modifiedDbTable] ?? null;

                                      if (
                                        subJson &&
                                        "color_status" in subJson
                                      ) {
                                        const colorStatusValue =
                                          subJson.color_status.toLowerCase();

                                        // Check if color_status value is in completeStatusArr
                                        if (
                                          !completeStatusArr.includes(
                                            colorStatusValue
                                          )
                                        ) {
                                          allMatch = false;
                                          break;
                                        }
                                      } else {
                                        allMatch = false;
                                        break;
                                      }
                                    }

                                    // Log the overall result
                                    if (allMatch) {
                                      readyForReport(
                                        "cmt",
                                        "ready",
                                        application.application_id,
                                        toArr,
                                        ccArr
                                      )
                                        .then(() => {
                                          console.log(
                                            "Send Mail for Report For Report"
                                          );

                                          return res.status(200).json({
                                            status: true,
                                            message: `CMT Application ${
                                              currentCMTApplication &&
                                              Object.keys(currentCMTApplication)
                                                .length > 0
                                                ? "updated"
                                                : "created"
                                            } successfully and mail sent.`,
                                            token: newToken,
                                          });
                                        })
                                        .catch((emailError) => {
                                          console.error(
                                            "Error sending email:",
                                            emailError
                                          );

                                          return res.status(200).json({
                                            status: true,
                                            message: `CMT Application ${
                                              currentCMTApplication &&
                                              Object.keys(currentCMTApplication)
                                                .length > 0
                                                ? "updated"
                                                : "created"
                                            } successfully but failed to send mail.`,
                                            token: newToken,
                                          });
                                        });
                                    } else {
                                      return res.status(200).json({
                                        status: true,
                                        message: `CMT Application ${
                                          currentCMTApplication &&
                                          Object.keys(currentCMTApplication)
                                            .length > 0
                                            ? "updated"
                                            : "created"
                                        } successfully.`,
                                        token: newToken,
                                      });
                                    }
                                  }
                                }
                              }
                            );
                          }
                        );
                      })
                      .catch((error) => {
                        return res.status(500).json({
                          status: false,
                          message: error,
                          token: newToken,
                        });
                      });
                  } else {
                    // If there are no annexures, send the response directly
                    return res.status(200).json({
                      status: true,
                      message: `CMT Application ${
                        currentCMTApplication &&
                        Object.keys(currentCMTApplication).length > 0
                          ? "updated"
                          : "created"
                      } successfully.`,
                      token: newToken,
                    });
                  }
                }
              );
            }
          );
        });
      });
    });
  });
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
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};
