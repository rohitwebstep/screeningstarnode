const crypto = require("crypto");
const Acknowledgement = require("../../models/admin/acknowledgementModel");
const Customer = require("../../models/customer/customerModel");
const AdminCommon = require("../../models/admin/commonModel");
const Service = require("../../models/admin/serviceModel");

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

  const action = JSON.stringify({ acknowledgement: "view" });
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

      // Fetch customers from Acknowledgement model
      Acknowledgement.list((err, customers) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({
            status: false,
            message: err.message,
            token: newToken,
          });
        }

        res.json({
          status: true,
          message: "Customers fetched successfully",
          customers: customers,
          totalResults: customers ? customers.length : 0,
          token: newToken,
        });
      });
    });
  });
};

exports.sendNotification = (req, res) => {
  const { admin_id, _token, customer_id } = req.body;

  // Check for missing fields
  const requiredFields = { admin_id, _token, customer_id };
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field] || requiredFields[field] === "")
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ acknowledgement: "send-notification" });

  // Check admin authorization
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (authResult) => {
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message,
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, tokenResult) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!tokenResult.status) {
        return res.status(401).json({
          status: false,
          message: tokenResult.message,
        });
      }

      const newToken = tokenResult.newToken;

      // Fetch the specific customer
      Customer.getActiveCustomerById(customer_id, (err, currentCustomer) => {
        if (err) {
          console.error("Database error during customer retrieval:", err);
          return res.status(500).json({
            status: false,
            message: "Failed to retrieve customer. Please try again.",
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

        // Fetch all customers from the Acknowledgement model
        Acknowledgement.list((err, customers) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          if (customers && customers.data && customers.data.length > 0) {
            let processedCount = 0; // Counter for processed customers

            customers.data.forEach((customer) => {
              const {
                id: customerId,
                admin_id: adminId,
                client_unique_id: clientUniqueId,
                name,
                applicationCount: totalApplications,
                branches,
              } = customer;

              console.log(`Customer ID: ${customerId}`);
              console.log(`Admin ID: ${adminId}`);
              console.log(`Client Unique ID: ${clientUniqueId}`);
              console.log(`Customer Name: ${name.trim()}`);
              console.log(`Total Applications: ${totalApplications}`);

              // Check if branches exist
              if (branches && branches.length > 0) {
                branches.forEach((branch) => {
                  const {
                    id: branchId,
                    customer_id: branchCustomerId,
                    name: branchName,
                    is_head: isHead,
                    head_id: headId,
                    applicationCount: branchApplications,
                  } = branch;

                  console.log(`  Branch ID: ${branchId}`);
                  console.log(`  Branch Customer ID: ${branchCustomerId}`);
                  console.log(`  Branch Name: ${branchName.trim()}`);
                  console.log(`  Is Head: ${isHead}`);
                  console.log(`  Head ID: ${headId}`);
                  console.log(
                    `  Branch Application Count: ${branchApplications}`
                  );

                  // Fetch client applications by branch ID
                  Acknowledgement.getClientApplicationByBranchIDForAckEmail(
                    branchId,
                    (err, applications) => {
                      if (err) {
                        console.error("Database error:", err);
                        return res.status(500).json({
                          status: false,
                          message:
                            "An error occurred while fetching client applications.",
                          token: newToken,
                        });
                      }

                      if (!applications.data.length) {
                        console.log(
                          `No client applications found for branch ID: ${branchId}`
                        );
                        processedCount++;
                        if (processedCount === customers.data.length) {
                          return res.status(200).json({
                            status: true,
                            message:
                              "Client applications processed successfully.",
                            token: newToken,
                          });
                        }
                        return; // Exit this branch's loop
                      }

                      // Loop through applications
                      const applicationPromises = applications.data.map(
                        (app) => {
                          const {
                            application_id: applicationId,
                            name,
                            services,
                          } = app;

                          console.log(`Application ID: ${applicationId}`);
                          console.log(`Name: ${name}`);

                          // Split services and process each one
                          const serviceIds = services
                            .split(",")
                            .map((service) => service.trim());
                          const serviceFetchPromises = serviceIds.map(
                            (serviceId) => {
                              return new Promise((resolve) => {
                                // Fetch the service title by ID
                                Service.getServiceById(
                                  serviceId,
                                  (err, currentService) => {
                                    if (err) {
                                      console.error(
                                        "Error fetching service data:",
                                        err
                                      );
                                      return resolve(null); // Skip this service
                                    }

                                    if (!currentService) {
                                      console.log(
                                        `Service not found for ID: ${serviceId}`
                                      );
                                      return resolve(null); // Skip this service
                                    }

                                    resolve(currentService.title);
                                  }
                                );
                              });
                            }
                          );

                          // Return a promise that resolves with the service titles
                          return Promise.all(serviceFetchPromises).then(
                            (serviceTitles) => {
                              // Filter out any null values from serviceTitles
                              const validServiceTitles = serviceTitles.filter(
                                (title) => title !== null
                              );
                              console.log(
                                `Service Titles for Application ID ${applicationId}: ${validServiceTitles.join(
                                  ", "
                                )}`
                              );
                            }
                          );
                        }
                      );

                      // Wait for all application promises to resolve
                      Promise.all(applicationPromises)
                        .then(() => {
                          processedCount++;
                          if (processedCount === customers.data.length) {
                            return res.status(200).json({
                              status: true,
                              message:
                                "Client applications processed successfully.",
                              token: newToken,
                            });
                          }
                        })
                        .catch((error) => {
                          console.error(
                            "Error processing applications:",
                            error
                          );
                          return res.status(500).json({
                            status: false,
                            message:
                              "An error occurred while processing applications.",
                            token: newToken,
                          });
                        });
                    }
                  );
                });
              } else {
                processedCount++;
              }
            });
          } else {
            return res.json({
              status: true,
              message: "Customers fetched successfully",
              customers: customers,
              totalResults: customers ? customers.data.length : 0,
              token: newToken,
            });
          }
        });
      });
    });
  });
};
