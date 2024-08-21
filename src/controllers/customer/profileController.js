const crypto = require("crypto");
const Customer = require("../../models/customer/customerModel");
const AdminCommon = require("../../models/admin/commonModel");

// Helper function to generate a password
const generatePassword = (companyName) => {
  const basePassword = companyName
    .split(" ")
    .map((word) => word.toLowerCase())
    .join("");
  return `${basePassword}@123`;
};

// Helper function to hash password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

exports.create = (req, res) => {
  const {
    admin_id,
    _token,
    company_name,
    client_code,
    address,
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
    agreement_document,
    additional_login,
    username,
    branches,
  } = req.body;

  console.log("Request body received:", req.body);

  // Define required fields
  const requiredFields = {
    admin_id,
    _token,
    company_name,
    client_code,
    address,
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
    agreement_document,
    additional_login,
    branches,
  };

  if (additional_login && additional_login.toLowerCase() === "yes") {
    requiredFields.username = username;
  }

  // Check for missing fields
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field])
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    console.log("Missing required fields:", missingFields);
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  // Verify admin token
  console.log("Checking admin token validity for admin_id:", admin_id);
  AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
    if (err) {
      console.error("Error checking token validity:", err);
      return res.status(500).json({ status: false, message: err.message });
    }

    if (!result.status) {
      console.log("Token validation failed:", result.message);
      return res.status(401).json({ status: false, message: result.message });
    }

    console.log("Token validated successfully. New token:", result.newToken);

    const newToken = result.newToken;
    const password = generatePassword(company_name);

    // Create new customer record
    console.log("Creating new customer record for client_code:", client_code);
    Customer.create(
      {
        admin_id,
        client_unique_id: client_code,
        client_id: client_code,
        name: company_name,
        address,
        profile_picture: null,
        email,
        email_verified_at: null,
        mobile_number,
        mobile_verified_at: null,
        password: hashPassword(password),
        reset_password_token: null,
        login_token: null,
        token_expiry: null,
        role,
        status: "0",
        created_at: new Date(),
        updated_at: new Date(),
      },
      (err, result) => {
        if (err) {
          console.error("Database error while creating customer:", err);
          AdminCommon.adminActivityLog(
            admin_id,
            "Customer",
            "Create",
            "0",
            null,
            err.message,
            () => {}
          );
          return res
            .status(500)
            .json({ status: false, message: "Failed to create customer." });
        }

        const customerId = result.insertId;
        console.log("Customer created successfully with ID:", customerId);

        // Create customer meta data
        console.log("Creating customer meta data for customer_id:", customerId);
        Customer.createCustomerMeta(
          {
            customer_id: customerId,
            company_name,
            address,
            mobile_number,
            email,
            email2: cc1_email,
            email3: cc2_email,
            email4: null,
            contact_person_name: contact_person,
            role,
            escalation_point_contact: name_of_escalation,
            single_point_of_contact: client_spoc,
            gst_number: gstin,
            agreement_date: date_agreement,
            agreement_duration: Agreement_Period,
            agreement_document,
            status: "0",
            state,
            state_code,
            additional_login,
            username:
              additional_login && additional_login.toLowerCase() === "yes"
                ? username
                : null,
            record_creation_date: new Date(),
          },
          (err, metaResult) => {
            if (err) {
              console.error(
                "Database error while creating customer meta:",
                err
              );
              AdminCommon.adminActivityLog(
                admin_id,
                "Customer",
                "CreateMeta",
                "0",
                `{id: ${customerId}}`,
                err.message,
                () => {}
              );
              return res
                .status(500)
                .json({
                  status: false,
                  message: "Failed to create customer meta.",
                });
            }

            console.log("Customer meta created successfully.");

            AdminCommon.adminActivityLog(
              admin_id,
              "Customer",
              "Create",
              "1",
              `{id: ${customerId}}`,
              null,
              () => {}
            );

            res.json({
              status: true,
              message: "Customer created successfully",
              data: {
                customer: result,
                meta: metaResult,
              },
              _token: newToken,
            });
          }
        );
      }
    );
  });
};
