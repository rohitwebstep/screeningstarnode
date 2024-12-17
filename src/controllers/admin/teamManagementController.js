const crypto = require("crypto");
const ClientMasterTrackerModel = require("../../models/admin/clientMasterTrackerModel");
const TeamManagement = require("../../models/admin/teamManagementModel");
const Customer = require("../../models/customer/customerModel");
const Branch = require("../../models/customer/branch/branchModel");
const AdminCommon = require("../../models/admin/commonModel");
const BranchCommon = require("../../models/customer/branch/commonModel");
const Permission = require("../../models/admin/permissionModel");

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

// Controller to list all customers
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

  const action = "admin_manager";
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

          if (application.is_data_qc !== 1) {
            console.warn("Application Data QC is not done yet 3");
            return res.status(404).json({
              status: false,
              message: "Data QC for application data is pending.",
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
                    const service_ids = application.services;
                    // Split service_id into an array
                    const serviceIds = service_ids
                      .split(",")
                      .map((id) => id.trim());
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
                            console.warn(
                              `Report form JSON not found for service ID ${id}`
                            );
                            annexureResults.push({
                              service_id: id,
                              serviceStatus: false,
                              message: "Report form JSON not found",
                            });
                            finalizeRequest();
                            return;
                          }

                          const parsedData = JSON.parse(reportFormJson.json);
                          const db_table = parsedData.db_table.replace(
                            /-/g,
                            "_"
                          );
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
                      if (pendingRequests === 0) {
                        if (!CMTApplicationData) {
                          return res.status(200).json({
                            status: true,
                            message: "Application fetched successfully 1",
                            application,
                            branchInfo: currentBranch,
                            results: annexureResults,
                            customerInfo: currentCustomer,
                            token: newToken,
                          });
                        } else {
                          return res.status(200).json({
                            status: true,
                            message: "Application fetched successfully 2",
                            application,
                            CMTData: CMTApplicationData,
                            results: annexureResults,
                            branchInfo: currentBranch,
                            customerInfo: currentCustomer,
                            token: newToken,
                          });
                        }
                      }
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

exports.generateReport = (req, res) => {
  const {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    statuses,
    send_mail,
  } = req.body;

  // Step 1: Validate required fields
  const requiredFields = {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    statuses,
  };
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field] || requiredFields[field] === "")
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = "admin_manager";

  // Step 2: Authorization and token validation
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (AuthResult) => {
    if (!AuthResult.status) {
      return res.status(403).json({
        status: false,
        message: AuthResult.message,
      });
    }

    AdminCommon.isAdminTokenValid(_token, admin_id, (err, TokenResult) => {
      if (err) {
        console.error("Token validation error:", err);
        return res.status(500).json({
          status: false,
          message: "Token validation failed. Please try again.",
        });
      }

      if (!TokenResult.status) {
        return res.status(401).json({
          status: false,
          message: TokenResult.message,
        });
      }

      const newToken = TokenResult.newToken;

      // Step 3: Validate Branch
      Branch.getBranchById(branch_id, (err, currentBranch) => {
        if (err || !currentBranch) {
          console.error("Branch retrieval error:", err || "Branch not found.");
          return res.status(404).json({
            status: false,
            message: "Branch not found.",
            token: newToken,
          });
        }

        if (parseInt(currentBranch.customer_id) !== parseInt(customer_id)) {
          return res.status(404).json({
            status: false,
            message: "Branch not found with matching customer ID.",
            token: newToken,
          });
        }

        // Step 4: Validate Customer
        Customer.getCustomerById(customer_id, (err, currentCustomer) => {
          if (err || !currentCustomer) {
            console.error(
              "Customer retrieval error:",
              err || "Customer not found."
            );
            return res.status(404).json({
              status: false,
              message: "Customer not found.",
              token: newToken,
            });
          }

          // Step 5: Fetch Permissions
          Permission.getPermissionById(admin_id, (err, currentPermission) => {
            if (err) {
              console.error("Permission retrieval error:", err);
              return res.status(500).json({
                status: false,
                message: "Failed to retrieve permissions.",
                token: newToken,
              });
            }

            // Step 6: Determine Granted Service IDs
            let grantedServiceIds = [];
            let skippedIds = [];

            if (
              currentPermission.role === "team_management" &&
              currentPermission.service_ids
            ) {
              grantedServiceIds = currentPermission.service_ids
                .split(",")
                .map((id) => Number(id.trim()))
                .filter((id) => !isNaN(id));
            } else {
              statuses.forEach((statusItem) => {
                const serviceId = Number(statusItem.service_id);
                if (!isNaN(serviceId)) {
                  grantedServiceIds.push(serviceId);
                }
              });
            }

            // Step 7: Process Status Updates
            const updatePromises = statuses.map((statusItem) => {
              return new Promise((resolve) => {
                const serviceId = Number(statusItem.service_id);
                const status = statusItem.status;

                if (grantedServiceIds.includes(serviceId)) {
                  TeamManagement.updateStatusOfAnnexureByDBTable(
                    application_id,
                    branch_id,
                    customer_id,
                    status,
                    statusItem.db_table,
                    (err, result) => {
                      if (err) {
                        console.error(
                          `Error updating status for Service ID ${serviceId}:`,
                          err
                        );
                        resolve({ serviceId, status: "update_failed" });
                      } else {
                        console.log(
                          `Status updated successfully for Service ID ${serviceId}:`,
                          result
                        );
                        resolve({ serviceId, status: "updated" });
                      }
                    }
                  );
                } else {
                  console.log(`Service ID ${serviceId} - Status Denied.`);
                  skippedIds.push(serviceId);
                  resolve({ serviceId, status: "skipped" });
                }
              });
            });

            // Step 8: Respond after processing all statuses
            Promise.all(updatePromises).then((results) => {
              res.status(200).json({
                status: true,
                message: "Statuses processed successfully.",
                updated_services: results.filter((r) => r.status === "updated"),
                skipped_service_ids: skippedIds,
                failed_updates: results.filter(
                  (r) => r.status === "update_failed"
                ),
                token: newToken,
              });
            });
          });
        });
      });
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

    const cleanDBColumn = dbColumn.replace("[", "").replace("]", "");
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

    const action = "admin_manager";
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

        const modifiedDbTable = dbTable.replace(/-/g, "_").toLowerCase();
        const cleanDBColumnForQry = cleanDBColumn
          .replace(/-/g, "_")
          .toLowerCase();

        // Call the model to upload images
        ClientMasterTrackerModel.upload(
          appId,
          modifiedDbTable,
          cleanDBColumnForQry,
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

                      if (application.is_data_qc !== 1) {
                        console.warn("Application Data QC is not done yet 3");
                        return res.status(404).json({
                          status: false,
                          message: "Data QC for application data is pending.",
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

                          ClientMasterTrackerModel.getCMTApplicationById(
                            appId,
                            (err, CMTApplicationData) => {
                              if (err) {
                                console.error("Database error:", err);
                                return res.status(500).json({
                                  status: false,
                                  message: err.message,
                                  token: newToken,
                                });
                              }

                              const case_initiated_date =
                                CMTApplicationData.initiation_date || "N/A";
                              const final_report_date =
                                CMTApplicationData.report_date || "N/A";
                              const report_type =
                                CMTApplicationData.report_type || "N/A";
                              const overall_status =
                                CMTApplicationData.overall_status || "N/A";

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
                                  case_initiated_date,
                                  final_report_date,
                                  report_type,
                                  overall_status,
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
