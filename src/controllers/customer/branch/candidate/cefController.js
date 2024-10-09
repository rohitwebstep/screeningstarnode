const Candidate = require("../../../../models/customer/branch/candidateApplicationModel");
const Branch = require("../../../../models/customer/branch/branchModel");
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

exports.isApplicationExist = (req, res) => {
  const { app_id, branch_id, customer_id } = req.query;

  let missingFields = [];
  if (
    !app_id ||
    app_id === "" ||
    app_id === undefined ||
    app_id === "undefined"
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
    app_id,
    branch_id,
    customer_id,
    (err, exists) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          status: false,
          message: "An error occurred while checking application existence.",
        });
      }

      if (exists) {
        res.json({
          status: true,
          message: "Application exists.",
        });
      } else {
        res.json({
          status: false,
          message: "Application does not exist.",
        });
      }
    }
  );
};

exports.submit = (req, res) => {
  const {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    resume_file,
    govt_id,
    personal_information,
    annexure,
  } = req.body;

  // Define required fields
  const requiredFields = {
    admin_id,
    _token,
    branch_id,
    customer_id,
    application_id,
    resume_file,
    govt_id,
    personal_information,
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

      CEF.getCEFApplicationById(
        application_id,
        (err, currentCEFApplication) => {
          if (err) {
            console.error(
              "Database error during CME Application retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve CME Application. Please try again.",
              token: newToken,
            });
          }

          let logStatus = "create";
          if (
            currentCEFApplication &&
            Object.keys(currentCEFApplication).length > 0
          ) {
            logStatus = "update";
          }

          CEF.create(
            resume_file,
            govt_id,
            personal_information,
            application_id,
            branch_id,
            customer_id,
            (err, cmeResult) => {
              if (err) {
                console.error(
                  "Database error during CME application update:",
                  err
                );

                return res.status(500).json({
                  status: false,
                  message: err,
                  token: newToken,
                });
              }

              if (typeof annexure === "object" && annexure !== null) {
                const annexurePromises = [];

                for (let key in annexure) {
                  const db_table = key ?? null;
                  const modifiedDbTable = db_table.replace(/-/g, "_");
                  const subJson = annexure[modifiedDbTable] ?? null;

                  const annexurePromise = new Promise((resolve, reject) => {
                    ClientMasterTrackerModel.getCMEFormDataByApplicationId(
                      application_id,
                      modifiedDbTable,
                      (err, currentCMEFormData) => {
                        if (err) {
                          console.error(
                            "Database error during CEF Annexure retrieval:",
                            err
                          );
                          return reject(err); // Reject the promise on error
                        }

                        if (logStatus == "update") {
                          cef_id = currentCEFApplication.id;
                        } else if (logStatus == "create") {
                          cef_id = cmeResult.insertId;
                        }

                        ClientMasterTrackerModel.createOrUpdateAnnexure(
                          cef_id,
                          application_id,
                          branch_id,
                          customer_id,
                          modifiedDbTable,
                          subJson,
                          (err, formDataResult) => {
                            if (err) {
                              console.error(
                                "Database error during CME Form Data create or update:",
                                err
                              );
                              return reject(err); // Reject the promise on error
                            }
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

                            return res.status(200).json({
                              status: true,
                              message: `CEF Application ${
                                currentCEFApplication &&
                                Object.keys(currentCEFApplication).length > 0
                                  ? "updated"
                                  : "created"
                              } successfully`,
                              token: newToken,
                            });
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
                  message: `CEF Application ${
                    currentCEFApplication &&
                    Object.keys(currentCEFApplication).length > 0
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
};
