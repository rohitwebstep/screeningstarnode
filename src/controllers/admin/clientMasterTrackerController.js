const crypto = require("crypto");
const ClientMasterTrackerModel = require("../../models/admin/clientMasterTrackerModel");
const Customer = require("../../models/customer/customerModel");
const ClientApplication = require("../../models/customer/branch/clientApplicationModel");
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

const fs = require("fs");
const path = require("path");
const { upload, saveImage, saveImages } = require("../../utils/imageSave");

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
    send_mail,
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

                                ClientMasterTrackerModel.getAttachmentsByClientAppID(
                                  application_id,
                                  (err, attachments) => {
                                    if (err) {
                                      console.error("Database error:", err);
                                      return res.status(500).json({
                                        status: false,
                                        message: "Database error occurred",
                                      });
                                    }

                                    ClientApplication.updateStatus(
                                      mainJson.overall_status,
                                      application_id,
                                      (err, result) => {
                                        if (err) {
                                          console.error(
                                            "Database error during client application status update:",
                                            err
                                          );
                                          return res.status(500).json({
                                            status: false,
                                            message: err.message,
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

                                          const gender =
                                            mainJson.gender?.toLowerCase();
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
                                              if (send_mail == 0) {
                                                return res.status(200).json({
                                                  status: true,
                                                  message: `CMT Application ${
                                                    currentCMTApplication &&
                                                    Object.keys(
                                                      currentCMTApplication
                                                    ).length > 0
                                                      ? "updated"
                                                      : "created"
                                                  } successfully`,
                                                  email_status: 1,
                                                  token: newToken,
                                                });
                                              }
                                              // Send email notification
                                              finalReportMail(
                                                "cmt",
                                                "final",
                                                company_name,
                                                gender_title,
                                                application.name,
                                                application.application_id,
                                                attachments,
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
                                                      Object.keys(
                                                        currentCMTApplication
                                                      ).length > 0
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
                                                      Object.keys(
                                                        currentCMTApplication
                                                      ).length > 0
                                                        ? "updated"
                                                        : "created"
                                                    } successfully but failed to send mail.`,
                                                    token: newToken,
                                                  });
                                                });
                                            } else if (verified === "no") {
                                              if (send_mail == 0) {
                                                return res.status(200).json({
                                                  status: true,
                                                  message: `CMT Application ${
                                                    currentCMTApplication &&
                                                    Object.keys(
                                                      currentCMTApplication
                                                    ).length > 0
                                                      ? "updated"
                                                      : "created"
                                                  } successfully`,
                                                  email_status: 2,
                                                  token: newToken,
                                                });
                                              }
                                              qcReportCheckMail(
                                                "cmt",
                                                "qc",
                                                gender_title,
                                                application.name,
                                                application.application_id,
                                                attachments,
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
                                                      Object.keys(
                                                        currentCMTApplication
                                                      ).length > 0
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
                                                      Object.keys(
                                                        currentCMTApplication
                                                      ).length > 0
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
                                                  Object.keys(
                                                    currentCMTApplication
                                                  ).length > 0
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
                                              const modifiedDbTable =
                                                db_table.replace(/-/g, "_");
                                              const subJson =
                                                annexure[modifiedDbTable] ??
                                                null;

                                              if (
                                                subJson &&
                                                "color_status" in subJson
                                              ) {
                                                const colorStatusValue =
                                                  subJson.color_status &&
                                                  typeof subJson.color_status ===
                                                    "string"
                                                    ? subJson.color_status.toLowerCase()
                                                    : null; // Or set a default value if needed

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
                                              if (send_mail == 3) {
                                                return res.status(200).json({
                                                  status: true,
                                                  message: `CMT Application ${
                                                    currentCMTApplication &&
                                                    Object.keys(
                                                      currentCMTApplication
                                                    ).length > 0
                                                      ? "updated"
                                                      : "created"
                                                  } successfully`,
                                                  email_status: 2,
                                                  token: newToken,
                                                });
                                              }
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
                                                      Object.keys(
                                                        currentCMTApplication
                                                      ).length > 0
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
                                                      Object.keys(
                                                        currentCMTApplication
                                                      ).length > 0
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
                                                  Object.keys(
                                                    currentCMTApplication
                                                  ).length > 0
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
      db_table: dbTable,
      db_column: dbColumn,
      send_mail,
      email_status: emailStatus,
    } = req.body;

    // Validate required fields and collect missing ones
    const requiredFields = {
      adminId,
      branchId,
      token,
      customerCode,
      appId,
      dbTable,
      dbColumn,
    };

    const missingFields = Object.keys(requiredFields).filter(
      (key) => !requiredFields[key]
    );

    // If there are missing fields, return an error response
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: `The following fields are required: ${missingFields.join(
          ", "
        )}`,
      });
    }

    if (send_mail == 1 && !emailStatus) {
      return res.status(400).json({
        status: false,
        message: "The field 'mailStatus' is required when sending email.",
      });
    }

    const action = JSON.stringify({ cmt_application: "generate_report" });
    // Check if the admin is authorized for the action
    AdminCommon.isAdminAuthorizedForAction(adminId, action, (AuthResult) => {
      if (!AuthResult.status) {
        return res.status(403).json({
          status: false,
          message: AuthResult.message,
        });
      }

      // Check if the admin token is valid
      AdminCommon.isAdminTokenValid(
        token,
        adminId,
        async (err, TokenResult) => {
          if (err) {
            console.error("Error checking token validity:", err);
            return res
              .status(500)
              .json({ status: false, message: err.message });
          }

          if (!TokenResult.status) {
            return res
              .status(401)
              .json({ status: false, message: TokenResult.message });
          }

          const newToken = TokenResult.newToken;

          // Define the target directory for uploads
          const targetDirectory = `uploads/customer/${customerCode}/${dbTable}`;

          // Create the target directory for uploads
          await fs.promises.mkdir(targetDirectory, { recursive: true });

          let savedImagePaths = [];

          // Check for multiple files under the "images" field
          if (req.files.images) {
            savedImagePaths = await saveImages(
              req.files.images,
              targetDirectory
            );
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
                return res.status(500).json({
                  status: false,
                  message:
                    result.error || "An error occurred while saving the image.",
                  token: newToken,
                });
              }

              // Handle the case where the upload was successful
              if (result && result.affectedRows > 0) {
                // Handle sending email notifications if required
                if (send_mail == 1) {
                  BranchCommon.getBranchandCustomerEmailsForNotification(
                    branchId,
                    (emailError, emailData) => {
                      if (emailError) {
                        console.error("Error fetching emails:", emailError);
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
                      const ccArr = customer.emails.split(",").map((email) => ({
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
                            });
                          }

                          if (!application) {
                            return res.status(404).json({
                              status: false,
                              message: "Application not found",
                              token: newToken,
                            });
                          }

                          ClientMasterTrackerModel.getAttachmentsByClientAppID(
                            appId,
                            (err, attachments) => {
                              if (err) {
                                console.error("Database error:", err);
                                return res.status(500).json({
                                  status: false,
                                  message: "Database error occurred",
                                  token: newToken,
                                });
                              }

                              // Update the client application status
                              ClientApplication.updateStatus(
                                application.overall_status,
                                appId,
                                (err) => {
                                  if (err) {
                                    console.error(
                                      "Database error during client application status update:",
                                      err
                                    );
                                    return res.status(500).json({
                                      status: false,
                                      message: err.message,
                                      token: newToken,
                                    });
                                  }

                                  const gender =
                                    application.gender?.toLowerCase();
                                  const marital_status =
                                    application.marital_status?.toLowerCase();

                                  let gender_title = "Mx.";

                                  if (gender === "male") {
                                    gender_title = "Mr.";
                                  } else if (gender === "female") {
                                    gender_title =
                                      marital_status === "married"
                                        ? "Mrs."
                                        : "Ms.";
                                  }

                                  // Prepare and send email based on application status
                                  // Final report email
                                  if (emailStatus == 1) {
                                    finalReportMail(
                                      "cmt",
                                      "final",
                                      company_name,
                                      gender_title,
                                      application.name,
                                      application.application_id,
                                      attachments,
                                      toArr,
                                      ccArr
                                    )
                                      .then(() => {
                                        console.log(
                                          "Sent Mail for Final Report"
                                        );
                                        return res.status(200).json({
                                          status: true,
                                          message: `CMT mail sent.`,
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
                                          message: `Failed to send CMT mail.`,
                                          token: newToken,
                                        });
                                      });
                                  }
                                  // QC report email
                                  else if (emailStatus == 2) {
                                    qcReportCheckMail(
                                      "cmt",
                                      "qc",
                                      gender_title,
                                      application.name,
                                      application.application_id,
                                      attachments,
                                      toArr,
                                      ccArr
                                    )
                                      .then(() => {
                                        console.log(
                                          "Sent Mail for Report For Quality Check"
                                        );
                                        return res.status(200).json({
                                          status: true,
                                          message: `CMT mail sent.`,
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
                                          message: `Failed to send CMT mail.`,
                                          token: newToken,
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
                                        console.log("Sent Mail for Report");
                                        return res.status(200).json({
                                          status: true,
                                          message: `CMT mail sent.`,
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
                                          message: `Failed to send CMT mail.`,
                                          token: newToken,
                                        });
                                      });
                                  } else {
                                    return res.status(200).json({
                                      status: true,
                                      message: `CMT Application processed successfully.`,
                                      token: newToken,
                                    });
                                  }
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                } else {
                  return res.status(201).json({
                    status: true,
                    message: "Annexure uploaded successfully.",
                    token: newToken,
                  });
                }
              } else {
                // If no rows were affected, indicate that no changes were made
                return res.status(400).json({
                  status: false,
                  message:
                    "No changes were made. Please check the client application ID.",
                  token: newToken,
                });
              }
            }
          );
        }
      );
    });
  });
};
