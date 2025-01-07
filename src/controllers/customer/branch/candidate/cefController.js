const Candidate = require("../../../../models/customer/branch/candidateApplicationModel");
const Customer = require("../../../../models/customer/customerModel");
const Branch = require("../../../../models/customer/branch/branchModel");
const BranchCommon = require("../../../../models/customer/branch/commonModel");
const CEF = require("../../../../models/customer/branch/cefModel");
const Service = require("../../../../models/admin/serviceModel");
const App = require("../../../../models/appModel");
const { cdfDataPDF } = require("../../../../utils/cdfDataPDF");
const fs = require("fs");
const path = require("path");
const {
  upload,
  saveImage,
  saveImages,
} = require("../../../../utils/cloudImageSave");

const {
  cefSubmitMail,
} = require("../../../../mailer/customer/branch/candidate/cefSubmitMail");

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

    return res.json({
      status: true,
      message: "Service form json fetched successfully.",
      formJson: result,
      totalResults: result.length,
    });
  });
};

exports.isApplicationExist = (req, res) => {
  const { candidate_application_id, branch_id, customer_id } = req.query;

  let missingFields = [];
  if (
    !candidate_application_id ||
    candidate_application_id === "" ||
    candidate_application_id === undefined ||
    candidate_application_id === "undefined"
  ) {
    missingFields.push("Application ID");
  }

  if (
    !branch_id ||
    branch_id === "" ||
    branch_id === undefined ||
    branch_id === "undefined"
  ) {
    missingFields.push("Branch ID");
  }

  if (
    !customer_id ||
    customer_id === "" ||
    customer_id === undefined ||
    customer_id === "undefined"
  ) {
    missingFields.push("Customer ID");
  }

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  Candidate.isApplicationExist(
    candidate_application_id,
    branch_id,
    customer_id,
    (err, currentCandidateApplication) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          status: false,
          message: "An error occurred while checking application existence.",
        });
      }

      if (currentCandidateApplication) {
        CEF.getCEFApplicationById(
          candidate_application_id,
          branch_id,
          customer_id,
          (err, currentCEFApplication) => {
            if (err) {
              console.error(
                "Database error during CEF application retrieval:",
                err
              );
              return res.status(500).json({
                status: false,
                message:
                  "Failed to retrieve CEF Application. Please try again.",
              });
            }

            Customer.getCustomerById(
              parseInt(customer_id),
              (err, currentCustomer) => {
                if (err) {
                  console.error(
                    "Database error during customer retrieval:",
                    err
                  );
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
                /*
            if (
              currentCEFApplication &&
              Object.keys(currentCEFApplication).length > 0
            ) {
              return res.status(400).json({
                status: false,
                message: "An application has already been submitted.",
              });
            }
            */

                const service_ids = Array.isArray(
                  currentCandidateApplication.services
                )
                  ? currentCandidateApplication.services
                  : currentCandidateApplication.services
                      .split(",")
                      .map((item) => item.trim());
                CEF.formJsonWithData(
                  service_ids,
                  candidate_application_id,
                  (err, serviceData) => {
                    if (err) {
                      console.error("Database error:", err);
                      return res.status(500).json({
                        status: false,
                        message:
                          "An error occurred while fetching service form json.",
                        token: newToken,
                      });
                    }
                    return res.status(200).json({
                      status: true,
                      data: {
                        application: currentCandidateApplication,
                        cefApplication: currentCEFApplication,
                        serviceData,
                        customer: currentCustomer,
                      },
                      message: "Application exists.",
                    });
                  }
                );
              }
            );
          }
        );
      } else {
        return res.status(404).json({
          status: false,
          message: "Application does not exist.",
        });
      }
    }
  );
};

exports.submit = (req, res) => {
  const {
    branch_id,
    customer_id,
    application_id,
    personal_information,
    annexure,
    is_submit,
    send_mail,
  } = req.body;

  let submitStatus = is_submit; // Use a local variable to avoid direct modification
  console.log(`submitStatus - `, submitStatus);
  if (submitStatus === 1) {
    const requiredFields = {
      branch_id,
      customer_id,
      application_id,
      personal_information,
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
  } else {
    submitStatus = 0;
  }

  // Check if the application exists
  Candidate.isApplicationExist(
    application_id,
    branch_id,
    customer_id,
    (err, currentCandidateApplication) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          status: false,
          message: "An error occurred while checking application existence.",
        });
      }

      if (!currentCandidateApplication) {
        return res.status(404).json({
          status: false,
          message: "Application does not exist.",
        });
      }

      // Retrieve branch details
      Branch.getBranchById(branch_id, (err, currentBranch) => {
        if (err) {
          console.error("Database error during branch retrieval:", err);
          return res.status(500).json({
            status: false,
            message: "Failed to retrieve Branch. Please try again.",
          });
        }

        if (
          !currentBranch ||
          parseInt(currentBranch.customer_id) !== parseInt(customer_id)
        ) {
          return res.status(404).json({
            status: false,
            message: "Branch not found or customer mismatch.",
          });
        }

        // Retrieve customer details
        Customer.getCustomerById(customer_id, (err, currentCustomer) => {
          if (err) {
            console.error("Database error during customer retrieval:", err);
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Customer. Please try again.",
            });
          }

          if (!currentCustomer) {
            return res.status(404).json({
              status: false,
              message: "Customer not found.",
            });
          }
          console.log(`Step - 1`);

          // Check if CEF application exists
          CEF.getCEFApplicationById(
            application_id,
            branch_id,
            customer_id,
            (err, currentCEFApplication) => {
              if (err) {
                console.error(
                  "Database error during CEF application retrieval:",
                  err
                );
                return res.status(500).json({
                  status: false,
                  message:
                    "Failed to retrieve CEF Application. Please try again.",
                });
              }

              /*
              if (
                currentCEFApplication &&
                Object.keys(currentCEFApplication).length > 0
              ) {
                return res.status(400).json({
                  status: false,
                  message: "An application has already been submitted.",
                });
              }
              */

              // Create new CEF application
              CEF.create(
                personal_information,
                application_id,
                branch_id,
                customer_id,
                (err, cefResult) => {
                  if (err) {
                    console.error(
                      "Database error during CEF application creation:",
                      err
                    );
                    return res.status(500).json({
                      status: false,
                      message:
                        "An error occurred while submitting the application.",
                    });
                  }
                  console.log(`Step - 2`);
                  console.log(`annexure - `, annexure);
                  // Handle annexures if provided
                  if (
                    typeof annexure === "object" &&
                    annexure !== null &&
                    Object.keys(annexure).length > 0
                  ) {
                    console.log(`cefResult - `, cefResult);
                    console.log(`Step - 3`);
                    const annexurePromises = Object.keys(annexure).map(
                      (key) => {
                        const modifiedDbTable = `${key.replace(/-/g, "_")}`;
                        const modifiedDbTableForDbQuery = `cef_${key
                          .replace(/-/g, "_")
                          .toLowerCase()}`;
                        const subJson = annexure[modifiedDbTable];

                        return new Promise((resolve, reject) => {
                          CEF.getCMEFormDataByApplicationId(
                            application_id,
                            modifiedDbTableForDbQuery,
                            (err, currentCMEFormData) => {
                              if (err) {
                                console.error(
                                  "Database error during annexure retrieval:",
                                  err
                                );
                                return reject(
                                  "Error retrieving annexure data."
                                );
                              }

                              /*
                              if (
                                currentCMEFormData &&
                                Object.keys(currentCMEFormData).length > 0
                              ) {
                                return reject(
                                  "Annexure has already been filed."
                                );
                              }
                              */

                              CEF.createOrUpdateAnnexure(
                                cefResult.insertId,
                                application_id,
                                branch_id,
                                customer_id,
                                modifiedDbTableForDbQuery,
                                subJson,
                                (err) => {
                                  if (err) {
                                    console.error(
                                      "Database error during annexure update:",
                                      err
                                    );
                                    return reject(
                                      "Error updating annexure data."
                                    );
                                  }
                                  resolve();
                                }
                              );
                            }
                          );
                        });
                      }
                    );
                    console.log(`Step - 4`);

                    // Process all annexure promises
                    Promise.all(annexurePromises)
                      .then(() => {
                        console.log(`submitStatus - `, submitStatus);
                        console.log(`send_mail - `, send_mail);

                        if (parseInt(send_mail) === 1 && submitStatus == 1) {
                          console.log("Sending notification emails...");
                          sendNotificationEmails(
                            application_id,
                            cefResult.insertId,
                            currentCandidateApplication.name,
                            branch_id,
                            customer_id,
                            currentCustomer.client_unique_id,
                            currentCustomer.name,
                            submitStatus,
                            res
                          );
                        } else {
                          console.log(
                            "Entering else block: submitStatus:",
                            submitStatus,
                            "send_mail:",
                            send_mail
                          );
                          return res.status(200).json({
                            status: true,
                            cef_id: cefResult.insertId,
                            message: "CEF Application submitted successfully.",
                          });
                        }
                      })
                      .catch((error) => {
                        console.error("Error in Promise.all:", error);
                        return res.status(400).json({
                          status: false,
                          message: error,
                        });
                      });
                  } else {
                    console.log(`Step - 10`);
                    CEF.updateSubmitStatus(
                      {
                        candidateAppId: application_id,
                        status: submitStatus,
                      },
                      (err, result) => {
                        if (err) {
                          console.error("Error updating submit status:", err);
                          return res.status(500).json({
                            status: false,
                            message:
                              "An error occurred while updating submit status. Please try again.",
                          });
                        }
                        // No annexures to handle, finalize submission
                        return res.status(200).json({
                          status: true,
                          message: "CEF Application submitted successfully.",
                        });
                      }
                    );
                  }
                }
              );
            }
          );
        });
      });
    }
  );
};

// Helper function to send notification emails
const sendNotificationEmails = (
  candidateAppId,
  cefID,
  name,
  branch_id,
  customer_id,
  client_unique_id,
  customer_name,
  submitStatus,
  res
) => {
  BranchCommon.getBranchandCustomerEmailsForNotification(
    branch_id,
    async (err, emailData) => {
      if (err) {
        console.error("Error fetching emails:", err);
        return res.status(500).json({
          status: false,
          message: "Failed to retrieve email addresses.",
        });
      }
      CEF.getAttachmentsByClientAppID(
        candidateAppId,
        async (err, attachments) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              status: false,
              message: "Database error occurred",
            });
          }

          App.appInfo("backend", async (err, appInfo) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({
                status: false,
                err,
                message: err.message,
              });
            }

            let imageHost = "www.example.in";

            if (appInfo) {
              imageHost = appInfo.cloud_host || "www.example.in";
            }

            const today = new Date();
            const formattedDate = `${today.getFullYear()}-${String(
              today.getMonth() + 1
            ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

            // Generate the PDF
            const pdfTargetDirectory = `uploads/customers/${client_unique_id}/candidate-applications/CD-${client_unique_id}-${candidateAppId}/background-reports`;

            const pdfFileName = `${name}_${formattedDate}.pdf`
              .replace(/\s+/g, "-")
              .toLowerCase();
            const pdfPath = await cdfDataPDF(
              candidateAppId,
              branch_id,
              customer_id,
              pdfFileName,
              pdfTargetDirectory
            );
            attachments += (attachments ? "," : "") + `${imageHost}/${pdfPath}`;
            const { branch, customer } = emailData;
            const toArr = [{ name: branch.name, email: branch.email }];
            const ccArr = JSON.parse(customer.emails).map((email) => ({
              name: customer.name,
              email: email.trim(),
            }));

            // Send application creation email
            cefSubmitMail(
              "Candidate Background Form",
              "submit",
              name,
              customer_name,
              attachments,
              toArr || [],
              ccArr || []
            )
              .then(() => {
                CEF.updateSubmitStatus(
                  { candidateAppId, status: submitStatus },
                  (err, result) => {
                    if (err) {
                      console.error("Error updating submit status:", err);
                      return res.status(500).json({
                        status: false,
                        message:
                          "An error occurred while updating submit status. Please try again.",
                      });
                    }
                    return res.status(201).json({
                      status: true,
                      message:
                        "CEF Application submitted successfully and notifications sent.",
                    });
                  }
                );
              })
              .catch((emailError) => {
                console.error(
                  "Error sending application creation email:",
                  emailError
                );
                return res.status(201).json({
                  status: true,
                  message:
                    "CEF Application submitted successfully, but email failed to send.",
                });
              });
          });
        }
      );
    }
  );
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
      cef_id: CefID,
      branch_id: branchId,
      customer_id: customerID,
      candidate_application_id: candidateAppId,
      db_table: dbTable,
      db_column: dbColumn,
      send_mail,
      is_submit,
    } = req.body;
    let submitStatus = is_submit; // Use a local variable to avoid direct modification

    if (submitStatus !== 1) {
      submitStatus = 0;
    }
    // Validate required fields and collect missing ones
    const requiredFields = {
      branchId,
      customerID,
      candidateAppId,
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

    Candidate.isApplicationExist(
      candidateAppId,
      branchId,
      customerID,
      (err, currentCandidateApplication) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            message: "An error occurred while checking application existence.",
          });
        }

        if (currentCandidateApplication) {
          Branch.getBranchById(branchId, (err, currentBranch) => {
            if (err) {
              console.error("Database error during branch retrieval:", err);
              return res.status(500).json({
                status: false,
                message: "Failed to retrieve Branch. Please try again.",
              });
            }

            if (
              !currentBranch ||
              parseInt(currentBranch.customer_id) !== parseInt(customerID)
            ) {
              return res.status(404).json({
                status: false,
                message: "Branch not found or customer mismatch.",
              });
            }
            // Retrieve customer details
            Customer.getCustomerById(
              customerID,
              async (err, currentCustomer) => {
                if (err) {
                  console.error(
                    "Database error during customer retrieval:",
                    err
                  );
                  return res.status(500).json({
                    status: false,
                    message: "Failed to retrieve Customer. Please try again.",
                  });
                }

                if (!currentCustomer) {
                  return res.status(404).json({
                    status: false,
                    message: "Customer not found.",
                  });
                }
                // Define the target directory for uploads
                const modifiedDbTable = dbTable
                  .replace(/-/g, "_")
                  .toLowerCase();
                const cleanDBColumnForQry = dbColumn
                  .replace(/-/g, "_")
                  .toLowerCase();
                const modifiedDbTableForDbQuery = `cef_${dbTable.replace(
                  /-/g,
                  "_"
                )}`;
                const targetDirectory = `uploads/customers/${currentCustomer.client_unique_id}/candidate-applications/CD-${currentCustomer.client_unique_id}-${candidateAppId}/annexures/${modifiedDbTable}`;

                // Create the target directory for uploads
                await fs.promises.mkdir(targetDirectory, {
                  recursive: true,
                });
                App.appInfo("backend", async (err, appInfo) => {
                  if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json({
                      status: false,
                      err,
                      message: err.message,
                    });
                  }

                  let imageHost = "www.example.in";

                  if (appInfo) {
                    imageHost = appInfo.cloud_host || "www.example.in";
                  }
                  let savedImagePaths = [];

                  // Check for multiple files under the "images" field
                  if (req.files.images && req.files.images.length > 0) {
                    const uploadedImages = await saveImages(
                      req.files.images,
                      targetDirectory
                    );
                    uploadedImages.forEach((imagePath) => {
                      savedImagePaths.push(`${imageHost}/${imagePath}`);
                    });
                  }

                  // Process single file upload
                  if (req.files.image && req.files.image.length > 0) {
                    const uploadedImage = await saveImage(
                      req.files.image[0],
                      targetDirectory
                    );
                    savedImagePaths.push(`${imageHost}/${uploadedImage}`);
                  }
                  CEF.upload(
                    CefID,
                    candidateAppId,
                    modifiedDbTableForDbQuery,
                    cleanDBColumnForQry,
                    savedImagePaths,
                    async (success, result) => {
                      if (!success) {
                        // If an error occurred, return the error details in the response
                        return res.status(500).json({
                          status: false,
                          message:
                            result ||
                            "An error occurred while saving the image.",
                          savedImagePaths,
                          // details: result.details,
                          // query: result.query,
                          // params: result.params,
                        });
                      }

                      if (parseInt(send_mail) === 1 && submitStatus == 1) {
                        sendNotificationEmails(
                          candidateAppId,
                          CefID,
                          currentCandidateApplication.name,
                          branchId,
                          customerID,
                          currentCustomer.client_unique_id,
                          currentCustomer.name,
                          submitStatus,
                          res
                        );
                      } else {
                        // Handle the case where the upload was successful
                        if (result && result.affectedRows > 0) {
                          return res.status(201).json({
                            status: true,
                            message:
                              "Candidate background Form submitted successfully.",
                            savedImagePaths,
                          });
                        } else {
                          // If no rows were affected, indicate that no changes were made
                          return res.status(400).json({
                            status: false,
                            message:
                              "Candidate background Form submitted successfully.",
                            result,
                            savedImagePaths,
                          });
                        }
                      }
                    }
                  );
                });
              }
            );
          });
        } else {
          return res.status(404).json({
            status: false,
            message: "Application does not exist.",
          });
        }
      }
    );
  });
};
