const crypto = require("crypto");
const Customer = require("../../models/customer/customerModel");
const AdminCommon = require("../../models/admin/commonModel"); // Adjusted import

// Utility function to check if a username is an email address
const isEmail = (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

// Utility function to generate a random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Utility function to get token expiry time (1 hour from current time)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

// Customer login handler
exports.create = (req, res) => {
  const {
    admin_id,
    _token,
    company_name,
    client_code,
    package_name,
    state,
    state_code,
    mobile_number,
    email,
    cc1_email,
    cc2_email,
    contact_person,
    role,
    name_of_escalation,
    client_spoc,
    gstin,
    tat,
    date_agreement,
    client_standard,
    Agreement_Period,
    agr_upload,
    yes,
    branch_name,
    branch_email
  } = req.body;

  const missingFields = [];

  // Validate required fields
  const requiredFields = {
    company_name,
    client_code,
    package_name,
    state,
    state_code,
    mobile_number,
    email,
    contact_person,
    role,
    name_of_escalation,
    client_spoc,
    gstin,
    tat,
    date_agreement,
    client_standard,
    Agreement_Period,
    agr_upload,
    branch_name,
    branch_email
  };

  Object.keys(requiredFields).forEach(field => {
    if (!requiredFields[field]) {
      missingFields.push(field.replace(/_/g, ' '));
    }
  });

  // If there are missing fields, return an error response
  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json(err);
    }

    if (!result.status) {
      return res.status(401).json({ status: false, message: result.message });
    }
    const newToken = result.newToken;

    Customer.create({
      admin_id,
      company_name,
      client_code,
      package_name,
      state,
      state_code,
      mobile_number,
      email,
      cc1_email,
      cc2_email,
      contact_person,
      role,
      name_of_escalation,
      client_spoc,
      gstin,
      tat,
      date_agreement,
      client_standard,
      Agreement_Period,
      agr_upload,
      yes,
      branch_name,
      branch_email
    }, (err, result) => {
      if (err) {
        console.error("Database error:", err);
        AdminCommon.adminActivityLog(
          admin_id,
          "Customer",
          "Create",
          "0",
          null,
          err.message,
          () => { }
        );
        return res.status(500).json({ status: false, message: err.message });
      }

      AdminCommon.adminActivityLog(
        admin_id,
        "Customer",
        "Create",
        "1",
        `{id: ${result.insertId}}`,
        null,
        () => { }
      );

      res.json({
        status: true,
        message: "Customer created successfully",
        data: result
      });
    });
  });
};
