const crypto = require("crypto");
const Acknowledgement = require("../../models/admin/acknowledgementModel");
const Customer = require("../../models/customer/customerModel");
const AdminCommon = require("../../models/admin/commonModel");
const Service = require("../../models/admin/serviceModel");

const {
  acknowledgementMail,
} = require("../../mailer/customer/acknowledgementMail");

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

        // Fetch acknowledgements for the customer
        Acknowledgement.listByCustomerID(customer_id, (err, customers) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({
              status: false,
              message: err.message,
              token: newToken,
            });
          }

          // Ensure customers is in the correct format
          if (!Array.isArray(customers.data)) {
            return res.status(500).json({
              status: false,
              message: "Invalid data format.",
              token: newToken,
            });
          }

          // Process each customer and their branches
          const enrichedCustomers = customers.data.map((customer) => {
            const enrichedBranches = customer.branches.map((branch) => {
              const enrichedApplications = branch.applications.map(
                (application) => {
                  const serviceIds =
                    typeof application.services === "string" &&
                    application.services.trim() !== ""
                      ? application.services.split(",").map((id) => id.trim())
                      : [];

                  // Initialize an array to hold service names for this application
                  const serviceNames = [];

                  // Function to fetch service names
                  const fetchServiceNames = (index = 0) => {
                    if (index >= serviceIds.length) {
                      // Return enriched application with services
                      return {
                        ...application,
                        serviceNames: serviceNames.join(", "),
                      };
                    }

                    const id = serviceIds[index];

                    // Fetch service name by ID
                    Service.getServiceById(id, (err, currentService) => {
                      if (err) {
                        console.error("Error fetching service data:", err);
                        return;
                      }

                      // Skip invalid services
                      if (currentService && currentService.title) {
                        serviceNames.push(currentService.title);
                      }

                      // Recursively fetch the next service
                      fetchServiceNames(index + 1);
                    });

                    // Returning the application is not immediate due to async calls, handle response after loop
                    return {
                      ...application,
                      serviceNames: serviceNames.join(", "),
                    };
                  };

                  return fetchServiceNames(); // Call the function to fetch service names
                }
              );

              return {
                ...branch,
                applications: enrichedApplications,
              };
            });

            return {
              ...customer,
              branches: enrichedBranches,
            };
          });

          // Send response
          if (enrichedCustomers.length > 0) {
            res.json({
              status: true,
              message: "Customers fetched successfully",
              customers: enrichedCustomers,
              totalResults: enrichedCustomers.length,
              token: newToken,
            });
          } else {
            res.json({
              status: false,
              message: "No applications for acknowledgement",
              token: newToken,
            });
          }
        });
      });
    });
  });
};
