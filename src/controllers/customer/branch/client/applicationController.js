const Client = require("../../../../models/customer/branch/clientApplicationModel");
const BranchCommon = require("../../../../models/customer/branch/commonModel");
const Branch = require("../../../../models/customer/branch/branchModel");
const Service = require("../../../../models/admin/serviceModel");
const {
  createMail,
} = require("../../../../mailer/customer/branch/client/createMail");

const fs = require("fs");
const path = require("path");
const {
  upload,
  saveImage,
  saveImages,
} = require("../../../../utils/imageSave");

exports.create = (req, res) => {
  const {
    branch_id,
    _token,
    customer_id,
    name,
    employee_id,
    spoc,
    location,
    batch_number,
    sub_client,
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
    spoc,
    location,
    batch_number,
    sub_client,
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

  const action = JSON.stringify({ client_application: "create" });

  // Check branch authorization
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message,
      });
    }

    // Validate branch token
    BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;

      // Check if employee ID is unique
      Client.checkUniqueEmpId(employee_id, (err, exists) => {
        if (err) {
          console.error("Error checking unique ID:", err);
          return res
            .status(500)
            .json({ status: false, message: err.message, token: newToken });
        }

        if (exists) {
          return res.status(400).json({
            status: false,
            message: `Client Employee ID '${employee_id}' already exists.`,
            token: newToken,
          });
        }

        // Create client application
        Client.create(
          {
            name,
            employee_id,
            spoc,
            location,
            batch_number,
            sub_client,
            branch_id,
            services,
            package,
            customer_id,
          },
          (err, result) => {
            if (err) {
              console.error(
                "Database error during client application creation:",
                err
              );
              BranchCommon.branchActivityLog(
                branch_id,
                "Client Application",
                "Create",
                "0",
                null,
                err.message,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message:
                  "Failed to create client application. Please try again.",
                token: newToken,
                err,
              });
            }

            BranchCommon.branchActivityLog(
              branch_id,
              "Client Application",
              "Create",
              "1",
              `{id: ${result.insertId}}`,
              null,
              () => {}
            );

            // Fetch branch and customer emails for notification
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

                Branch.getClientUniqueIDByBranchId(
                  branch_id,
                  (err, clientCode) => {
                    if (err) {
                      console.error("Error checking unique ID:", err);
                      return res.status(500).json({
                        status: false,
                        message: err.message,
                        token: newToken,
                      });
                    }

                    // Check if the unique ID exists
                    if (!clientCode) {
                      return res.status(400).json({
                        status: false,
                        message: `Customer Unique ID not Found`,
                        token: newToken,
                      });
                    }
                    Branch.getClientNameByBranchId(
                      branch_id,
                      (err, clientName) => {
                        if (err) {
                          console.error("Error checking client name:", err);
                          return res.status(500).json({
                            status: false,
                            message: err.message,
                            token: newToken,
                          });
                        }

                        // Check if the client name exists
                        if (!clientName) {
                          return res.status(400).json({
                            status: false,
                            message: "Customer Unique ID not found",
                            token: newToken,
                          });
                        }

                        const serviceIds =
                          typeof services === "string" && services.trim() !== ""
                            ? services.split(",").map((id) => id.trim())
                            : [];

                        const serviceNames = [];

                        // Function to fetch service names
                        const fetchServiceNames = (index = 0) => {
                          if (index >= serviceIds.length) {
                            // Once all services have been processed, send email notification
                            createMail(
                              "client application",
                              "create",
                              name,
                              result.new_application_id,
                              clientName,
                              clientCode,
                              serviceNames,
                              [],
                              toArr,
                              ccArr
                            )
                              .then(() => {
                                return res.status(201).json({
                                  status: true,
                                  message:
                                    "Client application created successfully and email sent.",
                                  data: {
                                    client: result,
                                    package,
                                  },
                                  token: newToken,
                                  toArr,
                                  ccArr,
                                });
                              })
                              .catch((emailError) => {
                                console.error(
                                  "Error sending email:",
                                  emailError
                                );
                                return res.status(201).json({
                                  status: true,
                                  message:
                                    "Client application created successfully, but failed to send email.",
                                  client: result,
                                  token: newToken,
                                });
                              });
                            return;
                          }

                          const id = serviceIds[index];

                          Service.getServiceById(id, (err, currentService) => {
                            if (err) {
                              console.error(
                                "Error fetching service data:",
                                err
                              );
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
                            serviceNames.push(currentService.title);

                            // Recursively fetch the next service
                            fetchServiceNames(index + 1);
                          });
                        };

                        // Start fetching service names
                        fetchServiceNames();
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  });
};

// Controller to list all clientApplications
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

  const action = JSON.stringify({ client_application: "view" });
  BranchCommon.isBranchAuthorizedForAction(branch_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify branch token
    BranchCommon.isBranchTokenValid(_token, branch_id, (err, tokenResult) => {
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

      Client.list(branch_id, (err, clientResults) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            message: "An error occurred while fetching client applications 2.",
            token: newToken,
            err,
          });
        }

        res.json({
          status: true,
          message: "Client applications fetched successfully.",
          clientApplications: clientResults,
          totalResults: clientResults.length,
          token: newToken,
        });
      });
    });
  });
};

exports.update = (req, res) => {
  const {
    branch_id,
    _token,
    client_application_id,
    name,
    attach_documents,
    employee_id,
    spoc,
    location,
    batch_number,
    sub_client,
    photo,
    services,
    package,
  } = req.body;

  // Define required fields
  const requiredFields = {
    branch_id,
    _token,
    client_application_id,
    name,
    attach_documents,
    employee_id,
    spoc,
    location,
    batch_number,
    sub_client,
    photo,
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

  const action = JSON.stringify({ client_application: "update" });
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

      // Fetch the current clientApplication
      Client.getClientApplicationById(
        client_application_id,
        (err, currentClientApplication) => {
          if (err) {
            console.error(
              "Database error during clientApplication retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Client. Please try again.",
              token: newToken,
            });
          }

          if (!currentClientApplication) {
            return res.status(404).json({
              status: false,
              message: "Client Aplication not found.",
              token: newToken,
            });
          }

          const changes = {};
          if (currentClientApplication.name !== name) {
            changes.name = { old: currentClientApplication.name, new: name };
          }
          if (currentClientApplication.attach_documents !== attach_documents) {
            changes.attach_documents = {
              old: currentClientApplication.attach_documents,
              new: attach_documents,
            };
          }
          if (currentClientApplication.employee_id !== employee_id) {
            changes.employee_id = {
              old: currentClientApplication.employee_id,
              new: employee_id,
            };
          }
          if (currentClientApplication.spoc !== spoc) {
            changes.spoc = {
              old: currentClientApplication.spoc,
              new: spoc,
            };
          }
          if (currentClientApplication.location !== location) {
            changes.location = {
              old: currentClientApplication.location,
              new: location,
            };
          }
          if (currentClientApplication.batch_number !== batch_number) {
            changes.batch_number = {
              old: currentClientApplication.batch_number,
              new: batch_number,
            };
          }
          if (currentClientApplication.sub_client !== sub_client) {
            changes.sub_client = {
              old: currentClientApplication.sub_client,
              new: sub_client,
            };
          }
          if (currentClientApplication.photo !== photo) {
            changes.photo = {
              old: currentClientApplication.photo,
              new: photo,
            };
          }
          if (
            services !== "" &&
            currentClientApplication.services !== services
          ) {
            changes.services = {
              old: currentClientApplication.services,
              new: services,
            };
          }
          if (package !== "" && currentClientApplication.package !== package) {
            changes.package = {
              old: currentClientApplication.package,
              new: package,
            };
          }
          Client.checkUniqueEmpIdByClientApplicationID(
            employee_id,
            client_application_id,
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
                exists.client_application_id !== client_application_id
              ) {
                return res.status(400).json({
                  status: false,
                  message: `Client Employee ID '${employee_id}' already exists.`,
                  token: newToken,
                });
              }

              Client.update(
                {
                  name,
                  attach_documents,
                  employee_id,
                  spoc,
                  location,
                  batch_number,
                  sub_client,
                  photo,
                  services,
                  package,
                },
                client_application_id,
                (err, result) => {
                  if (err) {
                    console.error(
                      "Database error during client application update:",
                      err
                    );
                    BranchCommon.branchActivityLog(
                      branch_id,
                      "Client Application",
                      "Update",
                      "0",
                      JSON.stringify({ client_application_id, ...changes }),
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
                    "Client Application",
                    "Update",
                    "1",
                    JSON.stringify({ client_application_id, ...changes }),
                    null,
                    () => {}
                  );

                  res.status(200).json({
                    status: true,
                    message: "Client application updated successfully.",
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

exports.upload = async (req, res) => {
  // Use multer to handle the upload
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        status: false,
        message: "Error uploading file.",
      });
    }

    try {
      const {
        branch_id,
        _token,
        customer_code,
        client_application_id,
        upload_category,
        mail_send,
      } = req.body;

      // Validate required fields and collect missing ones
      const requiredFields = {
        branch_id,
        _token,
        customer_code,
        client_application_id,
        upload_category,
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

      // Check if the admin is authorized
      const action = JSON.stringify({ client_application: "create" });
      const authorizationResult = await new Promise((resolve) => {
        BranchCommon.isBranchAuthorizedForAction(branch_id, action, resolve);
      });

      if (!authorizationResult.status) {
        return res.status(403).json({
          status: false,
          message: authorizationResult.message,
        });
      }

      // Validate branch token
      const tokenValidationResult = await new Promise((resolve) => {
        BranchCommon.isBranchTokenValid(_token, branch_id, (err, result) => {
          if (err) {
            console.error("Error checking token validity:", err);
            return res
              .status(500)
              .json({ status: false, message: err.message });
          }
          resolve(result);
        });
      });

      if (!tokenValidationResult.status) {
        return res
          .status(401)
          .json({ status: false, message: tokenValidationResult.message });
      }

      const newToken = tokenValidationResult.newToken;

      // Define the target directory for uploads
      let targetDir;
      let db_column;
      switch (upload_category) {
        case "photo":
          targetDir = `uploads/customer/${customer_code}`;
          db_column = `photo`;
          break;
        case "attach_documents":
          targetDir = `uploads/customer/${customer_code}/document`;
          db_column = `attach_documents`;
          break;
        default:
          return res.status(400).json({
            status: false,
            message: "Invalid upload category.",
            token: newToken,
          });
      }

      try {
        // Create the target directory for uploads
        await fs.promises.mkdir(targetDir, { recursive: true });

        let savedImagePaths = [];

        // Check for multiple files under the "images" field
        if (req.files.images) {
          savedImagePaths = await saveImages(req.files.images, targetDir);
        }

        // Check for a single file under the "image" field
        if (req.files.image && req.files.image.length > 0) {
          const savedImagePath = await saveImage(req.files.image[0], targetDir);
          savedImagePaths.push(savedImagePath);
        }

        // Save uploaded document paths to the database
        const uploadSuccess = await new Promise((resolve, reject) => {
          Client.upload(
            client_application_id,
            db_column,
            savedImagePaths,
            (err, result) => {
              if (err) {
                console.error("Database error while creating customer:", err);
                return reject(err);
              }
              resolve(result);
            }
          );
        });

        if (uploadSuccess) {
          // Return success response
          return res.status(201).json({
            status: true,
            message:
              savedImagePaths.length > 0
                ? "Image(s) saved successfully."
                : "No images uploaded.",
            data: savedImagePaths,
            token: newToken,
          });
        } else {
          // Return failure response with error detail
          console.error("Database update failed, no changes made.");
          return res.status(500).json({
            status: false,
            message: "Failed to update the database. No changes were made.",
            token: newToken,
          });
        }
      } catch (error) {
        console.error("Error saving image:", error);
        return res.status(500).json({
          status: false,
          message: "An error occurred while saving the image.",
          token: newToken,
          error: error.message || error,
        });
      }
    } catch (error) {
      console.error("Error processing upload:", error);
      return res.status(500).json({
        status: false,
        message: "An error occurred during the upload process.",
        error: error.message || error,
      });
    }
  });
};

exports.delete = (req, res) => {
  const { id, branch_id, _token } = req.query;

  // Validate required fields
  const missingFields = [];
  if (!id) missingFields.push("Client Application ID");
  if (!branch_id) missingFields.push("Branch ID");
  if (!_token) missingFields.push("Token");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ client_application: "delete" });

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

        // Fetch the current clientApplication
        Client.getClientApplicationById(id, (err, currentClientApplication) => {
          if (err) {
            console.error(
              "Database error during clientApplication retrieval:",
              err
            );
            return res.status(500).json({
              status: false,
              message: "Failed to retrieve Client. Please try again.",
              token: newToken,
            });
          }

          if (!currentClientApplication) {
            return res.status(404).json({
              status: false,
              message: "Client Aplication not found.",
              token: newToken,
            });
          }

          // Delete the clientApplication
          Client.delete(id, (err, result) => {
            if (err) {
              console.error(
                "Database error during clientApplication deletion:",
                err
              );
              BranchCommon.branchActivityLog(
                branch_id,
                "Client Application",
                "Delete",
                "0",
                JSON.stringify({ id }),
                err.message,
                () => {}
              );
              return res.status(500).json({
                status: false,
                message: "Failed to delete Client. Please try again.",
                token: newToken,
              });
            }

            BranchCommon.branchActivityLog(
              branch_id,
              "Client Application",
              "Delete",
              "1",
              JSON.stringify({ id }),
              null,
              () => {}
            );

            res.status(200).json({
              status: true,
              message: "Client Application deleted successfully.",
              result,
              token: newToken,
            });
          });
        });
      }
    );
  });
};
