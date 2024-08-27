const crypto = require("crypto");
const Customer = require("../../models/customer/customerModel");
const Branch = require("../../models/customer/branch/branchModel");
const AdminCommon = require("../../models/admin/commonModel");
const { sendEmail } = require("../../models/mailer/customerMailer");

// Helper function to generate a password
const generatePassword = (companyName) => {
  const firstName = companyName.split(" ")[0];
  return `${firstName}@123`;
};

// Helper function to hash password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

exports.create = (req, res) => {
  console.log("Request received for customer creation.");

  const {
    admin_id,
    _token,
    tat,
    role,
    state,
    gstin,
    emails,
    address,
    username,
    branches,
    state_code,
    clientData,
    agr_upload,
    client_spoc,
    client_code,
    package_name,
    company_name,
    mobile_number,
    contact_person,
    date_agreement,
    client_standard,
    additional_login,
    agreement_period,
    agreement_document,
    name_of_escalation,
    custom_template,
    custom_logo,
    custom_address,
  } = req.body;

  // Define required fields
  const requiredFields = {
    admin_id,
    _token,
    tat,
    role,
    state,
    gstin,
    emails,
    address,
    branches,
    state_code,
    clientData,
    agr_upload,
    client_spoc,
    client_code,
    package_name,
    company_name,
    mobile_number,
    contact_person,
    date_agreement,
    client_standard,
    additional_login,
    agreement_period,
    agreement_document,
    name_of_escalation,
    custom_template,
  };

  let additional_login_int = 0;
  if (additional_login && additional_login.toLowerCase() === "yes") {
    additional_login_int = 1;
    requiredFields.username = username;
  }

  if (custom_template && custom_template.toLowerCase() === "yes") {
    requiredFields.custom_logo = custom_logo;
    requiredFields.custom_address = custom_address;
  }

  // Check for missing fields
  const missingFields = Object.keys(requiredFields)
    .filter((field) => !requiredFields[field])
    .map((field) => field.replace(/_/g, " "));

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: false,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const action = JSON.stringify({ customer: "create" });
  AdminCommon.isAdminAuthorizedForAction(admin_id, action, (result) => {
    if (!result.status) {
      return res.status(403).json({
        status: false,
        message: result.message, // Return the message from the authorization function
      });
    }

    // Verify admin token
    AdminCommon.isAdminTokenValid(_token, admin_id, (err, result) => {
      if (err) {
        console.error("Error checking token validity:", err);
        return res.status(500).json({ status: false, message: err.message });
      }

      if (!result.status) {
        return res.status(401).json({ status: false, message: result.message });
      }

      const newToken = result.newToken;
      const password = generatePassword(company_name);

      // Check if client_unique_id already exists
      Customer.checkUniqueId(client_code, (err, exists) => {
        if (err) {
          console.error("Error checking unique ID:", err);
          return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
        }

        if (exists) {
          return res.status(400).json({
            status: false,
            message: `Client Unique ID '${client_code}' already exists.`,
          });
        }

        // Check if username is required and exists
        if (additional_login && additional_login.toLowerCase() === "yes") {
          Customer.checkUsername(username, (err, exists) => {
            if (err) {
              console.error("Error checking username:", err);
              return res
                .status(500)
                .json({ status: false, message: "Internal server error" });
            }

            if (exists) {
              return res.status(400).json({
                status: false,
                message: `Username '${username}' already exists.`,
              });
            }

            // Create new customer record
            createCustomerRecord();
          });
        } else {
          // Create new customer record
          createCustomerRecord();
        }
      });

      function createCustomerRecord() {
        Customer.create(
          {
            admin_id,
            client_unique_id: client_code,
            name: company_name,
            address,
            profile_picture: null,
            emails_json: JSON.stringify(emails),
            mobile_number,
            role,
            services: JSON.stringify(clientData),
            status: "0",
            additional_login: additional_login_int,
            username:
              additional_login && additional_login.toLowerCase() === "yes"
                ? username
                : null,
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
                .json({ status: false, message: err.message });
            }

            console.log("Customer created successfully. ID:", result.insertId);
            const customerId = result.insertId;

            Customer.createCustomerMeta(
              {
                customer_id: customerId,
                address,
                contact_person_name: contact_person,
                escalation_point_contact: name_of_escalation,
                single_point_of_contact: client_spoc,
                gst_number: gstin,
                tat_days: tat,
                agreement_date: date_agreement,
                agreement_duration: agreement_period,
                agreement_document,
                custom_template,
                custom_logo:
                  custom_template && custom_template.toLowerCase() === "yes"
                    ? custom_logo
                    : null,
                custom_address:
                  custom_template && custom_template.toLowerCase() === "yes"
                    ? custom_address
                    : null,
                state,
                state_code,
                payment_contact_person: null,
              },
              (err, metaResult) => {
                if (err) {
                  console.error(
                    "Database error while creating customer meta:",
                    err
                  );
                  AdminCommon.adminActivityLog(
                    admin_id,
                    "Customer Meta",
                    "Create",
                    "0",
                    `{id: ${customerId}}`,
                    err.message,
                    () => {}
                  );
                  return res.status(500).json({
                    status: false,
                    message: err.error,
                  });
                }

                console.log("Customer meta created successfully.");

                // Create the first branch (head branch)
                Branch.create(
                  {
                    customer_id: customerId,
                    name: branches[0].branch_name,
                    email: branches[0].branch_email,
                    head: 1,
                    password,
                  },
                  (err, headBranchResult) => {
                    if (err) {
                      console.error("Error creating head branch:", err);
                      return res.status(500).json({
                        status: false,
                        message:
                          "Internal server error while creating head branch.",
                      });
                    }

                    const headBranchId = headBranchResult.insertId;

                    // Create remaining branches with head_branch_id as foreign key
                    const branchCreationPromises = branches.slice(1).map(
                      (branch) =>
                        new Promise((resolve, reject) => {
                          Branch.create(
                            {
                              customer_id: customerId,
                              name: branch.branch_name,
                              email: branch.branch_email,
                              head: 0,
                              head_id: headBranchId,
                              password,
                            },
                            (err, branchResult) => {
                              if (err) {
                                console.error(
                                  "Error creating branch:",
                                  branch.branch_name,
                                  err
                                );
                                return reject(err);
                              }
                              console.log(
                                "Branch created successfully:",
                                branch.branch_name
                              );
                              resolve(branchResult);
                            }
                          );
                        })
                    );

                    Promise.all(branchCreationPromises)
                      .then((branchResults) => {
                        console.log("All branches created successfully.");
                        AdminCommon.adminActivityLog(
                          admin_id,
                          "Customer",
                          "Create",
                          "1",
                          `{id: ${customerId}}`,
                          null,
                          () => {}
                        );

                        // Send email notification
                        sendEmail(
                          "customer",
                          "create",
                          emails,
                          company_name,
                          password
                        )
                          .then(() => {
                            console.log("Email sent successfully.");
                            res.json({
                              status: true,
                              message:
                                "Customer and branches created successfully, and credentials sent through mail.",
                              data: {
                                customer: result,
                                meta: metaResult,
                                branches: [headBranchResult, ...branchResults],
                              },
                              _token: newToken,
                            });
                          })
                          .catch((emailError) => {
                            console.error("Error sending email:", emailError);
                            res.json({
                              status: true,
                              message:
                                "Customer and branches created successfully, but failed to send email.",
                              data: {
                                customer: result,
                                meta: metaResult,
                                branches: [headBranchResult, ...branchResults],
                              },
                              _token: newToken,
                            });
                          });
                      })
                      .catch((error) => {
                        console.error("Error creating branches:", error);
                        res.status(500).json({
                          status: false,
                          message: "Error creating some branches.",
                        });
                      });
                  }
                );
              }
            );
          }
        );
      }
    });
  });
};
