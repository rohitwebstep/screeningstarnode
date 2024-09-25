const crypto = require("crypto");
const pool = require("../../config/db");

// Function to hash the password using MD5
const hashPassword = (password) =>
  crypto.createHash("md5").update(password).digest("hex");

const Customer = {
  checkUniqueId: (clientUniqueId, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`customers\`
      WHERE \`client_unique_id\` = ?
    `;
    pool.query(sql, [clientUniqueId], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  checkUniqueIdForUpdate: (customer_id, clientUniqueId, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`customers\`
      WHERE \`client_unique_id\` = ? AND \`id\` != ?
    `;
    pool.query(sql, [clientUniqueId, customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  checkUsername: (username, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`customers\`
      WHERE \`username\` = ?
    `;
    pool.query(sql, [username], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  checkUsernameForUpdate: (customer_id, username, callback) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM \`customers\`
      WHERE \`username\` = ? AND \`id\` != ?
    `;
    pool.query(sql, [username, customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      const count = results[0].count;
      callback(null, count > 0);
    });
  },

  create: (customerData, callback) => {
    const sqlCustomers = `
      INSERT INTO \`customers\` (\`client_unique_id\`, \`name\`, \`additional_login\`, \`username\`, \`profile_picture\`, \`emails\`, \`mobile\`, \`services\`, \`admin_id\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesCustomers = [
      customerData.client_unique_id,
      customerData.name,
      customerData.additional_login,
      customerData.username,
      customerData.profile_picture,
      customerData.emails_json,
      customerData.mobile_number,
      customerData.services,
      customerData.admin_id,
    ];

    pool.query(sqlCustomers, valuesCustomers, (err, results) => {
      if (err) {
        console.error("Database insertion error for customers:", err);
        return callback({ message: err }, null);
      }

      const customerId = results.insertId;
      callback(null, { insertId: customerId });
    });
  },

  update: (customerId, customerData, callback) => {
    const sqlUpdateCustomer = `
      UPDATE \`customers\` 
      SET 
        \`client_unique_id\` = ?, 
        \`name\` = ?, 
        \`additional_login\` = ?, 
        \`username\` = ?, 
        \`profile_picture\` = ?, 
        \`emails\` = ?, 
        \`mobile\` = ?, 
        \`services\` = ?, 
        \`admin_id\` = ?
      WHERE \`id\` = ?
    `;

    const valuesUpdateCustomer = [
      customerData.client_unique_id,
      customerData.name,
      customerData.additional_login,
      customerData.username,
      customerData.profile_picture,
      customerData.emails_json,
      customerData.mobile,
      customerData.services,
      customerData.admin_id,
      customerId,
    ];

    pool.query(sqlUpdateCustomer, valuesUpdateCustomer, (err, results) => {
      if (err) {
        console.error("Database update error for customers:", err);
        return callback({ message: err }, null);
      }

      callback(null, results);
    });
  },

  createCustomerMeta: (metaData, callback) => {
    const sqlCustomerMetas = `
      INSERT INTO \`customer_metas\` (
        \`customer_id\`, \`address\`,
        \`contact_person_name\`, \`escalation_point_contact\`,
        \`single_point_of_contact\`, \`gst_number\`, \`tat_days\`, 
        \`agreement_date\`, \`agreement_duration\`, \`custom_template\`,
        \`custom_logo\`, \`custom_address\`, \`state\`, \`state_code\`, 
        \`payment_contact_person\`, \`client_standard\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesCustomerMetas = [
      metaData.customer_id,
      metaData.address,
      metaData.contact_person_name,
      metaData.escalation_point_contact,
      metaData.single_point_of_contact,
      metaData.gst_number,
      metaData.tat_days,
      metaData.agreement_date,
      metaData.agreement_duration,
      metaData.custom_template || "no",
      metaData.custom_logo || null,
      metaData.custom_address || null,
      metaData.state,
      metaData.state_code,
      metaData.payment_contact_person,
      metaData.client_standard,
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

  updateCustomerMetaByCustomerId: (customerId, metaData, callback) => {
    const sqlUpdateCustomerMetas = `
      UPDATE \`customer_metas\` 
      SET 
        \`address\` = ?, 
        \`contact_person_name\` = ?, 
        \`escalation_point_contact\` = ?, 
        \`single_point_of_contact\` = ?, 
        \`gst_number\` = ?, 
        \`tat_days\` = ?, 
        \`agreement_date\` = ?, 
        \`agreement_duration\` = ?, 
        \`custom_template\` = ?, 
        \`custom_logo\` = ?, 
        \`custom_address\` = ?, 
        \`state\` = ?, 
        \`state_code\` = ?, 
        \`payment_contact_person\` = ?,
        \`client_standard\` = ?
      WHERE \`customer_id\` = ?
    `;

    const valuesUpdateCustomerMetas = [
      metaData.address,
      metaData.contact_person_name,
      metaData.escalation_point_contact,
      metaData.single_point_of_contact,
      metaData.gst_number,
      metaData.tat_days,
      metaData.agreement_date,
      metaData.agreement_duration,
      metaData.custom_template || "no",
      metaData.custom_logo || null,
      metaData.custom_address || null,
      metaData.state,
      metaData.state_code,
      metaData.payment_contact_person,
      metaData.client_standard,
      customerId,
    ];

    pool.query(
      sqlUpdateCustomerMetas,
      valuesUpdateCustomerMetas,
      (err, results) => {
        if (err) {
          console.error("Database update error for customer_metas:", err);
          return callback(
            {
              message: "Database update error for customer_metas",
              error: err,
            },
            null
          );
        }

        callback(null, results);
      }
    );
  },

  list: (callback) => {
    const sql = `
      SELECT 
        customers.*, 
        customers.id AS main_id, 
        customer_metas.*, 
        customer_metas.id AS meta_id,
        COALESCE(branch_counts.branch_count, 0) AS branch_count
      FROM 
        customers
      LEFT JOIN 
        customer_metas 
      ON 
        customers.id = customer_metas.customer_id
      LEFT JOIN 
        (
          SELECT 
            customer_id, 
            COUNT(*) AS branch_count
          FROM 
            branches
          GROUP BY 
            customer_id
        ) AS branch_counts
      ON 
        customers.id = branch_counts.customer_id
      WHERE 
        customers.status != '0'
    `;

    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  inactiveList: (callback) => {
    const sql = `
      SELECT 
        customers.*, 
        customers.id AS main_id, 
        customer_metas.*, 
        customer_metas.id AS meta_id,
        COALESCE(branch_counts.branch_count, 0) AS branch_count
      FROM 
        customers
      LEFT JOIN 
        customer_metas 
      ON 
        customers.id = customer_metas.customer_id
      LEFT JOIN 
        (
          SELECT 
            customer_id, 
            COUNT(*) AS branch_count
          FROM 
            branches
          GROUP BY 
            customer_id
        ) AS branch_counts
      ON 
        customers.id = branch_counts.customer_id
      WHERE 
        customers.status != '1'
    `;

    pool.query(sql, (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  basicInfoByID: (customer_id, callback) => {
    const sql = `
      SELECT 
        customers.client_unique_id,
        customers.name, 
        customers.profile_picture, 
        customers.emails, 
        customers.mobile, 
        customers.services, 
        customers.id, 
        customer_metas.address,
        customer_metas.contact_person_name,
        customer_metas.escalation_point_contact,
        customer_metas.single_point_of_contact,
        customer_metas.gst_number,
        customer_metas.payment_contact_person,
        customer_metas.id AS meta_id
      FROM 
        customers
      LEFT JOIN 
        customer_metas 
      ON 
        customers.id = customer_metas.customer_id
      WHERE 
        customers.id = ?
    `;

    pool.query(sql, [customer_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  getCustomerById: (id, callback) => {
    const sql = "SELECT * FROM `customers` WHERE `id` = ?";
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  getCustomerMetaById: (id, callback) => {
    const sql = "SELECT * FROM `customer_metas` WHERE `customer_id` = ?";
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  active: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`status\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, ['1', id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  inactive: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`status\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, ['0', id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      callback(null, results);
    });
  },

  delete: (id, callback) => {
    const sql = `
        DELETE FROM \`customers\`
        WHERE \`id\` = ?
      `;
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
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

  fetchBranchPasswordByEmail: (email, callback) => {
    const sql = `
      SELECT \`password\` FROM \`branches\` WHERE \`email\` = ?
    `;
  
    pool.query(sql, [email], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback(err, null);
      }
      
      // Check if results exist and are not empty
      if (results.length > 0 && results[0].password) {
        return callback(null, results[0].password);  // Return the password
      } else {
        return callback(null, false);  // Return false if no result found or empty
      }
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
