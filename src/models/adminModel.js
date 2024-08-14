const pool = require('../config/db');

const Admin = {
  findByEmailOrMobile: (username, callback) => {

    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`status\`
      FROM \`admins\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;

    pool.query(sql, [username, username], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return callback({ message: 'Database query error', error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: 'No admin found with the provided email or mobile' }, null);
      }

      callback(null, results);
    });
  },

  validatePassword: (username, password, callback) => {
    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`status\`
      FROM \`admins\`
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
      UPDATE \`admins\`
      SET \`login_token\` = ?, \`token_expiry\` = ?
      WHERE \`id\` = ?
    `;

    pool.query(sql, [token, tokenExpiry, id], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return callback({ message: 'Database update error', error: err }, null);
      }

      if (results.affectedRows === 0) {
        return callback({ message: 'Token update failed. Admin not found or no changes made.' }, null);
      }

      callback(null, results);
    });
  },

  validateLogin: (id, callback) => {
  
    const sql = `
      SELECT \`login_token\`
      FROM \`admins\`
      WHERE \`id\` = ?
    `;
  
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return callback({ message: 'Database query error', error: err }, null);
      }
  
      if (results.length === 0) {
        return callback({ message: 'Admin not found' }, null);
      }
  
      callback(null, results);
    });
  }
  
};

module.exports = Admin;
