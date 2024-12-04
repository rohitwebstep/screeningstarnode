const DataManagement = require("../../models/admin/dataManagementModel");
const Common = require("../../models/admin/commonModel");
const crypto = require("crypto");
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
  const action = "data_manager";
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        err: authResult,
        message: authResult.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res
          .status(500)
          .json({ status: false, err, message: err.message });
      }

      if (!tokenResult.status) {
        return res.status(401).json({
          status: false,
          err: tokenResult,
          message: tokenResult.message,
        });
      }

      const newToken = tokenResult.newToken;

      // Fetch customer list with filter status
      DataManagement.list(filter_status, (err, customerResults) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            err,
            message: err.message,
            token: newToken,
          });
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

  const action = "data_manager";
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        err: result,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res
          .status(500)
          .json({ status: false, err, message: err.message });
      }

      if (!result.status) {
        return res
          .status(401)
          .json({ status: false, err: result, message: result.message });
      }

      const newToken = result.newToken;

      DataManagement.listByCustomerID(
        customer_id,
        filter_status,
        (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              status: false,
              err,
              message: err.message,
              token: newToken,
            });
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

  const action = "data_manager";
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        err: result,
        message: result.message, // Return the message from the authorization function
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
        });
      }
      // Verify admin token
      AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
        if (err) {
          console.error("Error checking token validity:", err);
          return res
            .status(500)
            .json({ status: false, err, message: err.message });
        }

        if (!result.status) {
          return res
            .status(401)
            .json({ status: false, err: result, message: result.message });
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

        DataManagement.applicationListByBranch(
          filter_status,
          branch_id,
          status,
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({
                status: false,
                err,
                message: err.message,
                token: newToken,
              });
            }

            res.json({
              status: true,
              message: "Branches tracker fetched successfully",
              parentName: currentBranch.name,
              customers: result,
              totalResults: result.length,
              token: newToken,
            });
          }
        );
      });
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

  const action = "data_manager";
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

      DataManagement.applicationByID(
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

          DataManagement.getCMTApplicationById(
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

exports.submit = (req, res) => {
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

  const action = "data_manager";

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
            token: newToken,
          });
        }
        console.log(`Step 1`);
        Customer.getCustomerById(customer_id, (err, currentCustomer) => {
          if (err) {
            console.error("Database error during customer retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Customer. Please try again.",
              token: newToken,
            });
          }
          console.log(`Step 2`);

          if (!currentCustomer) {
            return res.status(404).json({
              status: false,
              message: "Customer not found.",
              token: newToken,
            });
          }
          console.log(`Step 3`);

          DataManagement.getCMTApplicationById(
            application_id,
            (err, currentCMTApplication) => {
              console.log(`Step 4`);

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
              console.log(`Step 5`);

              // Flatten the updated_json object and separate annexure
              let { mainJson, annexureRawJson } =
                flattenJsonWithAnnexure(updated_json);
              console.log(`Step 6`);

              // Declare changes outside the conditional block
              const changes = {};
              let logStatus = "create";
              if (
                currentCMTApplication &&
                Object.keys(currentCMTApplication).length > 0
              ) {
                console.log(`Step 7`);

                logStatus = "update";
                const compareAndAddChanges = (key, newValue) => {
                  if (currentCMTApplication[key] !== newValue) {
                    changes[key] = {
                      old: currentCMTApplication[key],
                      new: newValue,
                    };
                  }
                };
                console.log(`Step 8`);

                // Compare and log changes
                Object.keys(mainJson).forEach((key) =>
                  compareAndAddChanges(key, mainJson[key])
                );
              }
              console.log(`Step 9`);

              DataManagement.generateReport(
                mainJson,
                application_id,
                branch_id,
                customer_id,
                (err, cmtResult) => {
                  console.log(`Step 10`);

                  if (err) {
                    console.error(
                      "Database error during CMT application update:",
                      err
                    );
                    console.log(`Step 11`);
                    const logData =
                      currentCMTApplication &&
                      Object.keys(currentCMTApplication).length > 0
                        ? JSON.stringify({ application_id, ...changes }) // changes is defined here
                        : JSON.stringify(mainJson);

                    AdminCommon.adminActivityLog(
                      admin_id,
                      "admin/client-master-tracker",
                      logStatus,
                      "0",
                      logData,
                      err,
                      () => {}
                    );
                    console.log(`Step 12`);

                    return res.status(500).json({
                      status: false,
                      message: err.message,
                      token: newToken,
                    });
                  }
                  console.log(`Step 13`);
                  const logDataSuccess =
                    currentCMTApplication &&
                    Object.keys(currentCMTApplication).length > 0
                      ? JSON.stringify({ application_id, ...changes }) // changes is defined here
                      : JSON.stringify(mainJson);

                  AdminCommon.adminActivityLog(
                    admin_id,
                    "admin/client-master-tracker",
                    logStatus,
                    "1",
                    logDataSuccess,
                    err,
                    () => {}
                  );
                  console.log(`Step 14`);
                  if (typeof annexure === "object" && annexure !== null) {
                    const annexurePromises = [];
                    console.log(`Step 15`);
                    for (let key in annexure) {
                      const db_table = key ?? null;
                      const modifiedDbTable = db_table
                        .replace(/-/g, "_")
                        .toLowerCase();
                      const subJson = annexure[modifiedDbTable] ?? null;

                      const annexurePromise = new Promise((resolve, reject) => {
                        DataManagement.getCMTAnnexureByApplicationId(
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

                            DataManagement.createOrUpdateAnnexure(
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
                                    "admin/client-master-tracker",
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
                                  "admin/client-master-tracker",
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
                    console.log(`Step 16`);
                    // Wait for all annexure operations to complete
                    Promise.all(annexurePromises)
                      .then(() => {
                        console.log(`Step 17`);
                        BranchCommon.getBranchandCustomerEmailsForNotification(
                          branch_id,
                          (emailError, emailData) => {
                            console.log(`Step 18`);
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
                            console.log(`Step 19`);
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
                            console.log(`Step 20`);
                            DataManagement.applicationByID(
                              application_id,
                              branch_id,
                              (err, application) => {
                                console.log(`Step 21`);

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
                                console.log(`Step 22`);

                                DataManagement.getCMTApplicationById(
                                  application_id,
                                  (err, CMTApplicationData) => {
                                    console.log(`Step 23`);

                                    if (err) {
                                      console.error("Database error:", err);
                                      return res.status(500).json({
                                        status: false,
                                        message: err.message,
                                        token: newToken,
                                      });
                                    }
                                    console.log(`Step 24`);

                                    const case_initiated_date =
                                      CMTApplicationData.initiation_date ||
                                      "N/A";
                                    const final_report_date =
                                      CMTApplicationData.report_date || "N/A";
                                    const report_type =
                                      CMTApplicationData.report_type || "N/A";
                                    DataManagement.getAttachmentsByClientAppID(
                                      application_id,
                                      (err, attachments) => {
                                        console.log(`Step 25`);

                                        if (err) {
                                          console.error("Database error:", err);
                                          return res.status(500).json({
                                            status: false,
                                            message: "Database error occurred",
                                          });
                                        }
                                        if (
                                          !mainJson.overall_status ||
                                          !mainJson.is_verify
                                        ) {
                                          // If there are no annexures, send the response directly
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

                                        ClientApplication.updateStatus(
                                          mainJson.overall_status,
                                          application_id,
                                          (err, result) => {
                                            console.log(`Step 26`);

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
                                            mainJson.is_verify =
                                              mainJson.is_verify &&
                                              mainJson.is_verify !== ""
                                                ? mainJson.is_verify
                                                : "no";
                                            console.log(`Step 27`);
                                            console.log(
                                              `mainJson.overall_status - `,
                                              mainJson.overall_status
                                            );
                                            console.log(
                                              `mainJson.is_verify - `,
                                              mainJson.is_verify
                                            );

                                            console.log(`Step 28`);

                                            const status =
                                              mainJson.overall_status.toLowerCase();
                                            const verified =
                                              mainJson.is_verify.toLowerCase();

                                            const gender =
                                              mainJson.gender?.toLowerCase();
                                            const marital_status =
                                              mainJson.marital_status?.toLowerCase();

                                            let gender_title = "Mr.";

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
                                              console.log(`Step 29`);

                                              if (verified === "yes") {
                                                console.log(`Step 30`);

                                                if (send_mail == 0) {
                                                  console.log(`Step 31`);

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
                                                  case_initiated_date,
                                                  final_report_date,
                                                  report_type,
                                                  mainJson.overall_status,
                                                  attachments,
                                                  toArr,
                                                  ccArr
                                                )
                                                  .then(() => {
                                                    console.log(`Step 32`);

                                                    return res
                                                      .status(200)
                                                      .json({
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
                                                    console.log(`Step 33`);

                                                    return res
                                                      .status(200)
                                                      .json({
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
                                                console.log(`Step 34`);

                                                if (send_mail == 0) {
                                                  console.log(`Step 35`);

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
                                                    console.log(`Step 36`);

                                                    return res
                                                      .status(200)
                                                      .json({
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
                                                    console.log(`Step 37`);

                                                    return res
                                                      .status(200)
                                                      .json({
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
                                                console.log(`Step 38`);
                                              } else {
                                                console.log(`Step 39`);

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
                                              console.log(`Step 40`);

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

                                                if (subJson) {
                                                  for (let prop in subJson) {
                                                    if (
                                                      prop.startsWith(
                                                        "color_status"
                                                      )
                                                    ) {
                                                      const colorStatusValue =
                                                        typeof subJson[prop] ===
                                                        "string"
                                                          ? subJson[
                                                              prop
                                                            ].toLowerCase()
                                                          : null;

                                                      if (
                                                        !completeStatusArr.includes(
                                                          colorStatusValue
                                                        )
                                                      ) {
                                                        allMatch = false;
                                                        break;
                                                      }
                                                    }
                                                  }
                                                } else {
                                                  allMatch = false;
                                                  break;
                                                }
                                              }
                                              console.log(`Step 41`);

                                              // Log the overall result
                                              if (allMatch) {
                                                console.log(`Step 42`);

                                                if (send_mail == 0) {
                                                  console.log(`Step 43`);

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
                                                  application.name,
                                                  mainJson.overall_status
                                                    .length < 4
                                                    ? mainJson.overall_status
                                                        .toUpperCase()
                                                        .replace(
                                                          /[^a-zA-Z0-9]/g,
                                                          " "
                                                        )
                                                    : mainJson.overall_status
                                                        .replace(
                                                          /[^a-zA-Z0-9\s]/g,
                                                          " "
                                                        )
                                                        .replace(
                                                          /\b\w/g,
                                                          (char) =>
                                                            char.toUpperCase()
                                                        ),
                                                  toArr,
                                                  ccArr
                                                )
                                                  .then(() => {
                                                    console.log(`Step 44`);

                                                    return res
                                                      .status(200)
                                                      .json({
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
                                                    console.log(`Step 45`);

                                                    console.error(
                                                      "Error sending email:",
                                                      emailError
                                                    );

                                                    return res
                                                      .status(200)
                                                      .json({
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
                                                console.log(`Step 46`);

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
                                        );
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

  const action = "data_manager";
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
