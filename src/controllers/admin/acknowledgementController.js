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
    .filter((field) => !requiredFields[field])
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
        Acknowledgement.listByCustomerID(customer_id, (err, customers) => {
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

            // Using Promise.all for better control over asynchronous calls
            const customerPromises = customers.data.map((customer) => {
              const { id: customerId, branches } = customer;

              if (branches && branches.length > 0) {
                return Promise.all(
                  branches.map((branch) => {
                    const { id: branchId } = branch;

                    return Acknowledgement.getClientApplicationByBranchIDForAckEmail(
                      branchId
                    ).then((applications) => {
                      if (!applications.data.length) {
                        console.log(
                          `No client applications found for branch ID: ${branchId}`
                        );
                        return;
                      }

                      const applicationPromises = applications.data.map(
                        (app) => {
                          const { application_id: applicationId, services } =
                            app;

                          // Split services and fetch titles
                          const serviceIds = services
                            .split(",")
                            .map((service) => service.trim());
                          const serviceFetchPromises = serviceIds.map(
                            (serviceId) =>
                              new Promise((resolve) => {
                                Service.getServiceById(
                                  serviceId,
                                  (err, currentService) => {
                                    if (err || !currentService) {
                                      console.error(
                                        "Error fetching service data:",
                                        err
                                      );
                                      return resolve(null); // Skip this service
                                    }
                                    resolve(currentService.title);
                                  }
                                );
                              })
                          );

                          // Return promise that resolves with service titles
                          return Promise.all(serviceFetchPromises).then(
                            (serviceTitles) => {
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

                      return Promise.all(applicationPromises);
                    });
                  })
                );
              } else {
                processedCount++;
                return Promise.resolve();
              }
            });

            // Wait for all customer promises to resolve
            Promise.all(customerPromises)
              .then(() => {
                res.status(200).json({
                  status: true,
                  message: "Client applications processed successfully.",
                  token: newToken,
                });
              })
              .catch((error) => {
                console.error("Error processing applications:", error);
                res.status(500).json({
                  status: false,
                  message: "An error occurred while processing applications.",
                  token: newToken,
                });
              });
          } else {
            res.json({
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
