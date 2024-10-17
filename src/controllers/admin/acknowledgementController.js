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

exports.sendNotification = async (req, res) => {
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

  try {
    // Check admin authorization
    const authResult = await AdminCommon.isAdminAuthorizedForAction(
      admin_id,
      action
    );
    if (!authResult.status) {
      return res.status(403).json({
        status: false,
        message: authResult.message,
      });
    }

    // Verify admin token
    const tokenResult = await AdminCommon.isAdminTokenValid(_token, admin_id);
    if (!tokenResult.status) {
      return res.status(401).json({
        status: false,
        message: tokenResult.message,
      });
    }

    const newToken = tokenResult.newToken;

    // Fetch the specific customer
    const currentCustomer = await Customer.getActiveCustomerById(customer_id);
    if (!currentCustomer) {
      return res.status(404).json({
        status: false,
        message: "Customer not found.",
        token: newToken,
      });
    }

    // Fetch all customers from the Acknowledgement model
    const customers = await Acknowledgement.list();
    if (!customers || !customers.data || customers.data.length === 0) {
      return res.json({
        status: true,
        message: "No customers found.",
        totalResults: 0,
        token: newToken,
      });
    }

    // Process each customer
    for (const customer of customers.data) {
      const {
        id: customerId,
        admin_id: adminId,
        client_unique_id: clientUniqueId,
        name,
        applicationCount: totalApplications,
      } = customer;

      console.log(`Customer ID: ${customerId}`);
      console.log(`Admin ID: ${adminId}`);
      console.log(`Client Unique ID: ${clientUniqueId}`);
      console.log(`Customer Name: ${name.trim()}`);
      console.log(`Total Applications: ${totalApplications}`);

      // Process each branch of the customer
      for (const branch of customer.branches) {
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
        console.log(`  Branch Application Count: ${branchApplications}`);

        // Fetch client applications by branch ID
        const applications =
          await Acknowledgement.getClientApplicationByBranchIDForAckEmail(
            branchId
          );
        if (
          !applications ||
          !applications.data ||
          applications.data.length === 0
        ) {
          console.log(
            `No client applications found for Branch ID: ${branchId}`
          );
          continue; // Skip to the next branch
        }

        // Process each application
        for (const app of applications.data) {
          const { application_id: applicationId, name, services } = app;
          console.log(`Application ID: ${applicationId}`);
          console.log(`Name: ${name}`);

          // Split services and process each one
          const serviceIds = services
            .split(",")
            .map((service) => service.trim());
          const serviceTitleArr = [];

          for (const serviceId of serviceIds) {
            const currentService = await Service.getServiceById(serviceId);
            if (currentService) {
              serviceTitleArr.push(currentService.title);
            } else {
              console.log(`Service not found for ID: ${serviceId}`);
            }
          }

          console.log(`Service Titles: ${serviceTitleArr.join(", ")}`);
        }
      }
    }

    // Success response after processing all applications
    return res.status(200).json({
      status: true,
      message: "Client applications fetched successfully.",
      data: customers.data,
      totalResults: customers.data.length,
      token: newToken,
    });
  } catch (error) {
    console.error("An error occurred:", error);
    return res.status(500).json({
      status: false,
      message: "An internal server error occurred. Please try again.",
    });
  }
};
