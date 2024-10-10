const Candidate = require("../../../../models/customer/branch/candidateApplicationModel");
const BranchCommon = require("../../../../models/customer/branch/commonModel");
const Service = require("../../../../models/admin/serviceModel");
const AppModel = require("../../../../models/appModel");

const {
  createMail,
} = require("../../../../mailer/customer/branch/candidate/createMail");

const {
  davMail,
} = require("../../../../mailer/customer/branch/candidate/davMail");

exports.create = (req, res) => {
  const {
    branch_id,
    _token,
    customer_id,
    name,
    employee_id,
    mobile_number,
    email,
    services,
    package,
  } = req.body;

  // Define required fields
  const requiredFields = {
    branch_id,
    _token,
    customer_id,
    name,
    employee_id,
    mobile_number,
    email,
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

  const action = JSON.stringify({ candidate_application: "create" });
  Candidate.isEmailUsedBefore(email, (err, emailUsed) => {
    if (err) {
      return res.status(500).json({
        status: false,
        message: "Internal Server Error: Unable to check email.",
        error: err.message,
      });
    }

    if (emailUsed) {
      return res.status(409).json({
        status: false,
        message: "Conflict: The email address has already been used.",
      });
    }
    BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
      if (!result.status) {
        return res.status(403).json({
          status: false,
          message: result.message,
        });
      }

      BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
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

        Candidate.checkUniqueEmpId(employee_id, (err, exists) => {
          if (err) {
            console.error("Error checking unique ID:", err);
            return res
              .status(500)
              .json({ status: false, message: err.message, token: newToken });
          }

          if (exists) {
            return res.status(400).json({
              status: false,
              message: `Candidate Employee ID '${employee_id}' already exists.`,
              token: newToken,
            });
          }

          Candidate.create(
            {
              branch_id,
              name,
              employee_id,
              mobile_number,
              email,
              services,
              package,
              customer_id,
            },
            (err, result) => {
              if (err) {
                console.error(
                  "Database error during candidate application creation:",
                  err
                );
                BranchCommon.branchActivityLog(
                  branch_id,
                  "Candidate Application",
                  "Create",
                  "0",
                  null,
                  err.message,
                  () => {}
                );
                return res.status(500).json({
                  status: false,
                  message: err.message,
                  token: newToken,
                });
              }

              BranchCommon.branchActivityLog(
                branch_id,
                "Candidate Application",
                "Create",
                "1",
                `{id: ${result.insertId}}`,
                null,
                () => {}
              );

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

                  // Prepare recipient and CC lists
                  const toArr = [{ name: branch.name, email: branch.email }];
                  const ccArr = customer.emails.split(",").map((email) => ({
                    name: customer.name,
                    email: email.trim(),
                  }));

                  const serviceIds = services.split(",").map((id) => id.trim());
                  const serviceNames = [];

                  // Function to fetch service names
                  const fetchServiceNames = (index = 0) => {
                    if (index >= serviceIds.length) {
                      AppModel.info((err, appInfo) => {
                        if (err) {
                          console.error("Database error:", err);
                          return res.status(500).json({
                            status: false,
                            message: err.message,
                            token: newToken,
                          });
                        }

                        if (appInfo) {
                          const appHost = appInfo.host;
                          const base64_app_id = btoa(result.insertId);
                          const base64_branch_id = btoa(branch_id);
                          const base64_customer_id = btoa(customer_id);
                          const base64_link_with_ids = `YXBwX2lk=${base64_app_id}&YnJhbmNoX2lk=${base64_branch_id}&Y3VzdG9tZXJfaWQ==${base64_customer_id};`;

                          const dav_href = `${appHost}/dav-form/${base64_link_with_ids}`;
                          const bgv_href = `${appHost}/background_form/${base64_link_with_ids}`;

                          Service.digitlAddressService((err, serviceEntry) => {
                            if (err) {
                              console.error("Database error:", err);
                              return res.status(500).json({
                                status: false,
                                message: err.message,
                                token: newToken,
                              });
                            }

                            if (serviceEntry) {
                              const digitalAddressID = serviceEntry.id;
                              if (serviceIds.includes(digitalAddressID)) {
                                davMail(
                                  "candidate application",
                                  "dav",
                                  name,
                                  customer.name,
                                  dav_href,
                                  {
                                    name: name,
                                    email: email.trim(),
                                  }
                                )
                                  .then(() => {
                                    console.error(
                                      "Digital address verification mail sent.",
                                      emailError
                                    );
                                  })
                                  .catch((emailError) => {
                                    console.error(
                                      "Error sending email:",
                                      emailError
                                    );
                                  });
                              }
                            }
                          });

                          createMail(
                            "candidate application",
                            "create",
                            name,
                            result.insertId,
                            bgv_href,
                            serviceNames,
                            toArr,
                            ccArr
                          )
                            .then(() => {
                              return res.status(201).json({
                                status: true,
                                message:
                                  "Candidate application created successfully and email sent.",
                                data: {
                                  candiate: result,
                                  package,
                                },
                                token: newToken,
                                toArr,
                                ccArr,
                              });
                            })
                            .catch((emailError) => {
                              console.error("Error sending email:", emailError);
                              return res.status(201).json({
                                status: true,
                                message:
                                  "Candidate application created successfully, but failed to send email.",
                                candidate: result,
                                token: newToken,
                              });
                            });
                        }
                      });
                    }

                    const id = serviceIds[index];

                    Service.getServiceRequiredDocumentsByServiceId(
                      id,
                      (err, currentService) => {
                        if (err) {
                          console.error("Error fetching service data:", err);
                          return res.status(500).json({
                            status: false,
                            message: err,
                            token: newToken,
                          });
                        }

                        // Skip invalid services and continue to the next index
                        if (!currentService || !currentService.title) {
                          return fetchServiceNames(index + 1);
                        }

                        // Add the current service name to the array
                        serviceNames.push(
                          `${currentService.title}: ${currentService.description}`
                        );

                        // Recursively fetch the next service
                        fetchServiceNames(index + 1);
                      }
                    );
                  };

                  // Start fetching service names
                  fetchServiceNames();
                }
              );
            }
          );
        });
      });
    });
  });
};

// Controller to list all candidateApplications
exports.list = (req, res) => {
  const { branch_id, _token } = req.query;

  let missingFields = [];
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ candidate_application: "view" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify branch token
    BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      Candidate.list(branch_id, (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            message: "An error occurred while fetching candidate applications.",
            token: newToken,
          });
        }

        res.json({
          status: true,
          message: "Candidate applications fetched successfully.",
          candidateApplications: result,
          totalResults: result.length,
          token: newToken,
        });
      });
    });
  });
};

exports.update = (req, res) => {
  const {
    branch_id,
    candidate_application_id,
    _token,
    name,
    employee_id,
    mobile_number,
    email,
    services,
    package,
  } = req.body;

  // Define required fields
  const requiredFields = {
    branch_id,
    candidate_application_id,
    _token,
    name,
    employee_id,
    mobile_number,
    email,
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

  const action = JSON.stringify({ candidate_application: "update" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message,
      });
    }

    BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;
      // Fetch the current candidateApplication
      Candidate.getCandidateApplicationById(
        candidate_application_id,
        (err, currentCandidateApplication) => {
          if (err) {
            console.error(
              "Database error during candidateApplication retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Candidate. Please try again.",
              token: newToken,
            });
          }

          if (!currentCandidateApplication) {
            return res.status(404).json({
              status: false,
              message: "Candidate Aplication not found.",
              token: newToken,
            });
          }

          const changes = {};
          if (currentCandidateApplication.name !== name) {
            changes.name = { old: currentCandidateApplication.name, new: name };
          }
          if (currentCandidateApplication.email !== email) {
            changes.email = {
              old: currentCandidateApplication.email,
              new: email,
            };
          }
          if (currentCandidateApplication.employee_id !== employee_id) {
            changes.employee_id = {
              old: currentCandidateApplication.employee_id,
              new: employee_id,
            };
          }
          if (currentCandidateApplication.mobile_number !== mobile_number) {
            changes.mobile_number = {
              old: currentCandidateApplication.mobile_number,
              new: mobile_number,
            };
          }
          if (
            services !== "" &&
            currentCandidateApplication.services !== services
          ) {
            changes.services = {
              old: currentCandidateApplication.services,
              new: services,
            };
          }
          if (
            package !== "" &&
            currentCandidateApplication.package !== package
          ) {
            changes.package = {
              old: currentCandidateApplication.package,
              new: package,
            };
          }

          Candidate.checkUniqueEmpIdByCandidateApplicationID(
            employee_id,
            candidate_application_id,
            (err, exists) => {
              if (err) {
                console.error("Error checking unique ID:", err);
                return res.status(500).json({
                  status: false,
                  message: err.message,
                  token: newToken,
                });
              }

              if (
                exists &&
                exists.candidate_application_id !== candidate_application_id
              ) {
                return res.status(400).json({
                  status: false,
                  message: `Candidate Employee ID '${employee_id}' already exists.`,
                  token: newToken,
                });
              }

              Candidate.update(
                {
                  name,
                  employee_id,
                  mobile_number,
                  email,
                  services,
                  package,
                },
                candidate_application_id,
                (err, result) => {
                  if (err) {
                    console.error(
                      "Database error during candidate application update:",
                      err
                    );
                    BranchCommon.branchActivityLog(
                      branch_id,
                      "Candidate Application",
                      "Update",
                      "0",
                      JSON.stringify({ candidate_application_id, ...changes }),
                      err.message,
                      () => {}
                    );
                    return res.status(500).json({
                      status: false,
                      message: err.message,
                      token: newToken,
                    });
                  }

                  BranchCommon.branchActivityLog(
                    branch_id,
                    "Candidate Application",
                    "Update",
                    "1",
                    JSON.stringify({ candidate_application_id, ...changes }),
                    null,
                    () => {}
                  );

                  res.status(200).json({
                    status: true,
                    message: "Candidate application updated successfully.",
                    package: result,
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

exports.delete = (req, res) => {
  const { id, branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id) missingFields.push("Candidate Application ID");
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ candidate_application: "delete" });

  // Check branch authorization
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      // Check the status returned by the authorization function
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Validate branch token
    BranchCommon.isBranchTokenValid(
      _token,
      branch_id,
      (err, tokenValidationResult) => {
        if (err) {
          console.error("Token validation error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
          });
        }

        if (!tokenValidationResult.status) {
          return res.status(401).json({
            status: false,
            message: tokenValidationResult.message,
          });
        }

        const newToken = tokenValidationResult.newToken;

        // Fetch the current candidateApplication
        Candidate.getCandidateApplicationById(
          id,
          (err, currentCandidateApplication) => {
            if (err) {
              console.error(
                "Database error during candidateApplication retrieval:",
                err
              );
              return res.status(500).json({
                status: false,
                message: "Failed to retrieve Candidate. Please try again.",
                token: newToken,
              });
            }

            if (!currentCandidateApplication) {
              return res.status(404).json({
                status: false,
                message: "Candidate Aplication not found.",
                token: newToken,
              });
            }

            // Delete the candidateApplication
            Candidate.delete(id, (err, result) => {
              if (err) {
                console.error(
                  "Database error during candidateApplication deletion:",
                  err
                );
                BranchCommon.branchActivityLog(
                  branch_id,
                  "Candidate Application",
                  "Delete",
                  "0",
                  JSON.stringify({ id }),
                  err.message,
                  () => {}
                );
                return res.status(500).json({
                  status: false,
                  message: "Failed to delete Candidate. Please try again.",
                  token: newToken,
                });
              }

              BranchCommon.branchActivityLog(
                branch_id,
                "Candidate Application",
                "Delete",
                "1",
                JSON.stringify({ id }),
                null,
                () => {}
              );

              res.status(200).json({
                status: true,
                message: "Candidate Application deleted successfully.",
                result,
                token: newToken,
              });
            });
          }
        );
      }
    );
  });
};
