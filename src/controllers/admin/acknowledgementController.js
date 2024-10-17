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

          // New structure to store customers with service names
          const newCustomersArray = customers.data.map((customer) => {
            return {
              ...customer,
              branches: customer.branches.map((branch) => {
                const applicationsWithServices = branch.applications.map(
                  (application) => {
                    const serviceIds =
                      typeof application.services === "string" &&
                      application.services.trim() !== ""
                        ? application.services.split(",").map((id) => id.trim())
                        : [];

                    const serviceNames = [];

                    // Function to fetch service names
                    const fetchServiceNames = (index = 0) => {
                      if (index >= serviceIds.length) {
                        return serviceNames; // Return the array of service names
                      }

                      const id = serviceIds[index];

                      // Fetch service by ID
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
                    };

                    // Start fetching service names
                    fetchServiceNames();

                    // Map service names to application
                    return {
                      ...application,
                      services: serviceNames.join(", ") || application.services, // Default to original services if none found
                    };
                  }
                );

                return {
                  ...branch,
                  applications: applicationsWithServices,
                };
              }),
            };
          });

          // Send response
          if (newCustomersArray.length > 0) {
            return res.json({
              status: true,
              message: "Customers fetched successfully",
              customers: newCustomersArray,
              totalResults: newCustomersArray.length,
              token: newToken,
            });
          } else {
            return res.json({
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
