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

        // Initialize the array to hold customer data
        const customerArr = {
          customerInfo: {
            id: currentCustomer.id,
            name: currentCustomer.name,
            branches: [],
          },
        };

        // Fetch all customers from the Acknowledgement model
        Acknowledgement.list((err, customers) => {
          if (err) {
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          if (customers && customers.data && customers.data.length > 0) {
            let processedCount = 0; // Counter for processed customers

            customers.data.forEach((customer) => {
              const { id: customerId, branches } = customer;

              // Check if branches exist
              if (branches && branches.length > 0) {
                const branchPromises = branches.map((branch) => {
                  const { id: branchId, name: branchName } = branch;

                  // Fetch client applications by branch ID
                  return new Promise((resolve) => {
                    Acknowledgement.getClientApplicationByBranchIDForAckEmail(
                      branchId,
                      (err, applications) => {
                        if (err || !applications) {
                          return resolve({
                            branchId,
                            branchName,
                            applications: [],
                          }); // Return empty applications if error occurs
                        }

                        // Loop through applications
                        const applicationPromises = applications.data.map(
                          (app) => {
                            const {
                              application_id: applicationId,
                              name,
                              services,
                            } = app;

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
                                      if (err || !currentService) {
                                        return resolve(null); // Skip if not found
                                      }
                                      resolve(currentService.title);
                                    }
                                  );
                                });
                              }
                            );

                            // Return a promise that resolves with the application data
                            return Promise.all(serviceFetchPromises).then(
                              (serviceTitles) => {
                                return {
                                  applicationId,
                                  name,
                                  services: serviceTitles.filter(Boolean), // Filter out nulls
                                };
                              }
                            );
                          }
                        );

                        // Wait for all application promises to resolve
                        return Promise.all(applicationPromises).then(
                          (applicationData) => {
                            return {
                              branchId,
                              branchName,
                              applications: applicationData.filter(
                                (app) => app.services.length > 0
                              ), // Only keep applications with services
                            };
                          }
                        );
                      }
                    );
                  });
                });

                // Wait for all branches to be processed
                Promise.all(branchPromises)
                  .then((branchData) => {
                    customerArr.customerInfo.branches = branchData;
                    processedCount++;

                    if (processedCount === customers.data.length) {
                      // Send success response after processing all customers
                      return res.status(200).json({
                        status: true,
                        message: "Client applications processed successfully.",
                        customerData: customerArr,
                        token: newToken,
                      });
                    }
                  })
                  .catch((error) => {
                    return res.status(500).json({
                      status: false,
                      message: "An error occurred while processing branches.",
                      token: newToken,
                    });
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
