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

          // Process each customer
          customers.data.forEach((customer) => {
            console.log(`Customer ID: ${customer.id}`);
            console.log(`Admin ID: ${customer.admin_id}`);
            console.log(`Client Unique ID: ${customer.client_unique_id}`);
            console.log(`Customer Name: ${customer.name.trim()}`); // trim() to remove whitespace
            console.log(`Application Count: ${customer.applicationCount}`);

            // Loop through the branches
            customer.branches.forEach((branch) => {
              console.log(`  Branch ID: ${branch.id}`);
              console.log(`  Branch Name: ${branch.name.trim()}`); // trim() to remove whitespace
              console.log(`  Is Head: ${branch.is_head ? "Yes" : "No"}`);
              console.log(`  Applications: `);

              // Process each application
              Promise.all(
                branch.applications.map((application) => {
                  const serviceIds =
                    typeof application.services === "string" &&
                    application.services.trim() !== ""
                      ? application.services.split(",").map((id) => id.trim())
                      : [];

                  // Initialize a variable to hold service names for this application
                  let serviceNamesString = ""; // Create a string to hold service names

                  // Function to fetch service names as a promise
                  const fetchServiceNames = (index = 0) => {
                    return new Promise((resolve) => {
                      if (index >= serviceIds.length) {
                        // Set the application serviceNames to the comma-separated string
                        application.serviceNames = serviceNamesString;
                        resolve(); // Resolve the promise when done
                        return;
                      }

                      const id = serviceIds[index];

                      Service.getServiceById(id, (err, currentService) => {
                        if (err) {
                          console.error("Error fetching service data:", err);
                          resolve(); // Resolve on error to continue
                          return;
                        }

                        // Skip invalid services and continue to the next index
                        if (currentService && currentService.title) {
                          // Append the service name to the string, with a comma if not the first name
                          serviceNamesString +=
                            (serviceNamesString ? ", " : "") +
                            currentService.title;
                        }

                        // Recursively fetch the next service
                        fetchServiceNames(index + 1).then(resolve);
                      });
                    });
                  };

                  // Start fetching service names and wait for the promise to resolve
                  return fetchServiceNames();
                })
              ).then(() => {
                console.log(`  Application Count: ${branch.applicationCount}`);
              });
            });

            console.log("-------------------------");
          });

          // Send response
          if (customers.data.length > 0) {
            res.json({
              status: true,
              message: "Customers fetched successfully",
              customers: customers.data,
              totalResults: customers.data.length,
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
