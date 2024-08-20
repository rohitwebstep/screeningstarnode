const pool = require('../../config/db');

const Customer = {
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
