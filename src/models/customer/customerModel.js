const pool = require('../../config/db');

const Customer = {
  create: (customerData, callback) => {
    const sql = `
      INSERT INTO \`customers\` (
        \`admin_id\`, \`company_name\`, \`client_code\`, \`package_name\`, \`state\`, \`state_code\`, \`mobile_number\`,
        \`email\`, \`cc1_email\`, \`cc2_email\`, \`contact_person\`, \`role\`, \`name_of_escalation\`,
        \`client_spoc\`, \`gstin\`, \`tat\`, \`date_agreement\`, \`client_standard\`, \`Agreement_Period\`,
        \`agr_upload\`, \`yes\`, \`branch_name\`, \`branch_email\`
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      customerData.admin_id, customerData.company_name, customerData.client_code, customerData.package_name, customerData.state,
      customerData.state_code, customerData.mobile_number, customerData.email, customerData.cc1_email,
      customerData.cc2_email, customerData.contact_person, customerData.role, customerData.name_of_escalation,
      customerData.client_spoc, customerData.gstin, customerData.tat, customerData.date_agreement,
      customerData.client_standard, customerData.Agreement_Period, customerData.agr_upload, customerData.yes,
      customerData.branch_name, customerData.branch_email
    ];

    pool.query(sql, values, (err, results) => {
      if (err) {
        console.error('Database insertion error:', err);
        return callback({ message: 'Database insertion error', error: err }, null);
      }

      callback(null, results);
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
