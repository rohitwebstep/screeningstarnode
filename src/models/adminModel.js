const pool = require('../config/db');

const Admin = {
  findByEmailOrMobile: (username, callback) => {
    // Log the query operation
    console.log('Querying findByEmailOrMobile for:', username);
    const sql = `
      SELECT * FROM \`admins\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;
    pool.query(sql, [username, username], (err, results) => {
      if (err) {
        // Log database query errors
        console.error('Database query error:', err);
        return callback(err, null);
      }
      // Log the results of the query
      console.log('Query results:', results);
      callback(null, results);
    });
  },

  validatePassword: (username, password, callback) => {
    // Log the query operation
    console.log('Querying validatePassword for:', username);
    const sql = `
      SELECT * FROM \`admins\`
      WHERE (\`email\` = ? OR \`mobile\` = ?)
      AND \`password\` = MD5(?)
    `;
    pool.query(sql, [username, username, password], (err, results) => {
      if (err) {
        // Log database query errors
        console.error('Database query error:', err);
        return callback(err, null);
      }
      // Log the results of the query
      console.log('Query results:', results);
      callback(null, results);
    });
  },

  updateToken: (id, token, tokenExpiry, callback) => {
    // Log the query operation
    console.log('Updating token for admin ID:', id);
    const sql = `
      UPDATE \`admins\`
      SET \`login_token\` = ?, \`token_expiry\` = ?
      WHERE \`id\` = ?
    `;
    pool.query(sql, [token, tokenExpiry, id], (err, results) => {
      if (err) {
        // Log database query errors
        console.error('Database query error:', err);
        return callback(err, null);
      }
      // Log the results of the update operation
      console.log('Update results:', results);
      callback(null, results);
    });
  },
};

module.exports = Admin;
