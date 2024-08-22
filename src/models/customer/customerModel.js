const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Customer = {
  create: (customerData, callback) => {
    const sqlCustomers = `
      INSERT INTO \`customers\` (
        \`client_unique_id\`, \`client_id\`, \`name\`, \`profile_picture\`, \`email\`,
        \`email_verified_at\`, \`mobile\`, \`mobile_verified_at\`, \`password\`,
        \`reset_password_token\`, \`login_token\`, \`token_expiry\`, \`role\`,
        \`status\`, \`created_at\`, \`updated_at\`, \`admin_id\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesCustomers = [
      customerData.client_unique_id,
      customerData.client_id,
      customerData.name,
      customerData.profile_picture,
      customerData.email,
      customerData.email_verified_at,
      customerData.mobile_number,
      customerData.mobile_verified_at,
      customerData.password,
      customerData.reset_password_token,
      customerData.login_token,
      customerData.token_expiry,
      customerData.role,
      customerData.status || "0",
      new Date(),
      new Date(),
      customerData.admin_id,
    ];

    pool.query(sqlCustomers, valuesCustomers, (err, results) => {
      if (err) {
        console.error("Database insertion error for customers:", err);
        return callback(
          { message: "Database insertion error for customers", error: err },
          null
        );
      }

      const customerId = results.insertId;
      callback(null, { insertId: customerId });
    });
  },

  createCustomerMeta: (metaData, callback) => {
    const sqlCustomerMetas = `
      INSERT INTO \`customer_metas\` (
        \`customer_id\`, \`company_name\`, \`address\`, \`phone_number\`, \`email\`,
        \`email2\`, \`email3\`, \`username\`,
        \`contact_person_name\`, \`contact_person_title\`, \`escalation_point_contact\`,
        \`single_point_of_contact\`, \`gst_number\`, \`tat_days\`, \`service_description\`,
        \`service_fee\`, \`agreement_date\`, \`agreement_duration\`,
        \`agreement_document\`, \`custom_template\`, \`custom_logo\`, \`custom_address\`,
        \`status\`, \`state\`, \`state_code\`, \`additional_login\`,
        \`standard_operating_procedures\`, \`package_category\`,
        \`service_codes\`, \`payment_contact_person\`, \`created_at\`, \`updated_at\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesCustomerMetas = [
      metaData.customer_id,
      metaData.company_name,
      metaData.address,
      metaData.phone_number,
      metaData.email,
      metaData.email2,
      metaData.email3,
      metaData.username,
      metaData.contact_person_name,
      metaData.contact_person_title,
      metaData.escalation_point_contact,
      metaData.single_point_of_contact,
      metaData.gst_number,
      metaData.tat_days,
      metaData.service_description,
      metaData.service_fee,
      metaData.agreement_date,
      metaData.agreement_duration,
      metaData.agreement_document,
      metaData.custom_template || "no",
      metaData.custom_logo,
      metaData.custom_address,
      metaData.status || "0",
      metaData.state,
      metaData.state_code,
      metaData.additional_login,
      metaData.standard_operating_procedures,
      metaData.package_category,
      metaData.service_codes,
      metaData.payment_contact_person,
      new Date(),
      new Date(),
    ];

    pool.query(sqlCustomerMetas, valuesCustomerMetas, (err, results) => {
      if (err) {
        console.error("Database insertion error for customer_metas:", err);
        return callback(
          {
            message: "Database insertion error for customer_metas",
            error: err,
          },
          null
        );
      }

      callback(null, results);
    });
  },

  findByEmailOrMobile: (username, callback) => {
    const sql = `
      SELECT \`id\`, \`email\`, \`mobile\`, \`password\`
      FROM \`customers\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;

    pool.query(sql, [username, username], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback(
          { message: "No customer found with the provided email or mobile" },
          null
        );
      }

      callback(null, results);
    });
  },

  validatePassword: (username, password, callback) => {
    const sql = `
      SELECT \`id\`, \`password\` FROM \`customers\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;

    pool.query(sql, [username, username], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback(
          { message: "No customer found with the provided email or mobile" },
          null
        );
      }

      const customer = results[0];
      if (hashPassword(password) !== customer.password) {
        return callback({ message: "Incorrect password" }, null);
      }

      callback(null, results);
    });
  },

  updateToken: (id, token, tokenExpiry, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`login_token\` = ?, \`token_expiry\` = ?
      WHERE \`id\` = ?
    `;

    pool.query(sql, [token, tokenExpiry, id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database update error", error: err }, null);
      }

      if (results.affectedRows === 0) {
        return callback(
          {
            message:
              "Token update failed. Customer not found or no changes made.",
          },
          null
        );
      }

      callback(null, results);
    });
  },

  validateLogin: (id, callback) => {
    const sql = `
      SELECT \`login_token\`
      FROM \`customers\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: "Customer not found" }, null);
      }

      callback(null, results);
    });
  },

  logout: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`login_token\` = NULL, \`token_expiry\` = NULL
      WHERE \`id\` = ?
    `;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database update error", error: err }, null);
      }

      if (results.affectedRows === 0) {
        return callback(
          {
            message:
              "Token clear failed. Customer not found or no changes made.",
          },
          null
        );
      }

      callback(null, results);
    });
  },
};

module.exports = Customer;
