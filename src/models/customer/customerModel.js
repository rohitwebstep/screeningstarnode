const pool = require('../../config/db');

const Customer = {
  create: (customerData, callback) => {
    // Insert into customers table
    const sqlCustomers = `
      INSERT INTO \`customers\` (
        \`client_unique_id\`, \`client_id\`, \`name\`, \`profile_picture\`, \`email\`, 
        \`email_verified_at\`, \`mobile\`, \`mobile_verified_at\`, \`password\`, 
        \`reset_password_token\`, \`login_token\`, \`token_expiry\`, \`role\`, 
        \`status\`, \`created_at\`, \`updated_at\`, \`admin_id\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const valuesCustomers = [
      customerData.client_unique_id, customerData.client_id, customerData.name, customerData.profile_picture, customerData.email,
      customerData.email_verified_at, customerData.mobile, customerData.mobile_verified_at, customerData.password,
      customerData.reset_password_token, customerData.login_token, customerData.token_expiry, customerData.role,
      customerData.status || '0', new Date(), new Date(), customerData.admin_id
    ];

    pool.query(sqlCustomers, valuesCustomers, (err, results) => {
      if (err) {
        console.error('Database insertion error for customers:', err);
        return callback({ message: 'Database insertion error for customers', error: err }, null);
      }

      // Get the inserted customer ID for use in customer_metas table
      const customerId = results.insertId;

      // Insert into customer_metas table
      const sqlCustomerMetas = `
      INSERT INTO \`customer_metas\` (
        \`customer_id\`, \`company_name\`, \`address\`, \`phone_number\`, \`email\`, 
        \`email2\`, \`email3\`, \`email4\`, \`secondary_username\`, 
        \`contact_person_name\`, \`contact_person_title\`, \`escalation_point_contact\`, 
        \`single_point_of_contact\`, \`gst_number\`, \`tat_days\`, \`service_description\`, 
        \`service_fee\`, \`agreement_text\`, \`agreement_expiration_date\`, \`agreement_duration\`, 
        \`agreement_document\`, \`custom_template\`, \`logo\`, \`custom_billing_address\`, 
        \`status\`, \`state\`, \`state_code\`, \`additional_login_info\`, 
        \`standard_operating_procedures\`, \`record_creation_date\`, \`package_category\`, 
        \`service_codes\`, \`payment_contact_person\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const valuesCustomerMetas = [
        customerId, customerData.company_name, customerData.address, customerData.phone_number, customerData.email,
        customerData.email2, customerData.email3, customerData.email4, customerData.secondary_username,
        customerData.contact_person_name, customerData.contact_person_title, customerData.escalation_point_contact,
        customerData.single_point_of_contact, customerData.gst_number, customerData.tat_days, customerData.service_description,
        customerData.service_fee, customerData.agreement_text, customerData.agreement_expiration_date, customerData.agreement_duration,
        customerData.agreement_document, customerData.custom_template || 'no', customerData.logo, customerData.custom_billing_address,
        customerData.status || '0', customerData.state, customerData.state_code, customerData.additional_login_info,
        customerData.standard_operating_procedures, customerData.record_creation_date, customerData.package_category,
        customerData.service_codes, customerData.payment_contact_person
      ];

      pool.query(sqlCustomerMetas, valuesCustomerMetas, (err, results) => {
        if (err) {
          console.error('Database insertion error for customer_metas:', err);
          return callback({ message: 'Database insertion error for customer_metas', error: err }, null);
        }

        callback(null, results);
      });
    });
  },

  findByEmailOrMobile: (username, callback) => {
    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`status\`, \`login_token\`, \`token_expiry\`
      FROM \`customers\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;

    pool.query(sql, [username, username], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return callback({ message: 'Database query error', error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: 'No customer found with the provided email or mobile' }, null);
      }

      callback(null, results);
    });
  },

  validatePassword: (username, password, callback) => {
    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`status\`
      FROM \`customers\`
      WHERE (\`email\` = ? OR \`mobile\` = ?)
      AND \`password\` = MD5(?)
    `;

    pool.query(sql, [username, username, password], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return callback({ message: 'Database query error', error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: 'Incorrect password or username' }, null);
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
        console.error('Database query error:', err);
        return callback({ message: 'Database update error', error: err }, null);
      }

      if (results.affectedRows === 0) {
        return callback({ message: 'Token update failed. Customer not found or no changes made.' }, null);
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
        console.error('Database query error:', err);
        return callback({ message: 'Database query error', error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: 'Customer not found' }, null);
      }

      callback(null, results);
    });
  },

  // Clear login token and token expiry
  logout: (id, callback) => {
    const sql = `
      UPDATE \`customers\`
      SET \`login_token\` = NULL, \`token_expiry\` = NULL
      WHERE \`id\` = ?
    `;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return callback({ message: 'Database update error', error: err }, null);
      }

      if (results.affectedRows === 0) {
        return callback({ message: 'Token clear failed. Customer not found or no changes made.' }, null);
      }

      callback(null, results);
    });
  }
};

module.exports = Customer;
