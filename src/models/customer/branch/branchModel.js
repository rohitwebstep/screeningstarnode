const pool = require("../../../config/db");

const Branch = {
  findByEmailOrMobile: (username, callback) => {
    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`status\`, \`login_token\`, \`token_expiry\`
      FROM \`branches\`
      WHERE \`email\` = ? OR \`mobile\` = ?
    `;

    pool.query(sql, [username, username], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback(
          { message: "No branch found with the provided email or mobile" },
          null
        );
      }

      callback(null, results);
    });
  },

  validatePassword: (username, password, callback) => {
    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`status\`
      FROM \`branches\`
      WHERE (\`email\` = ? OR \`mobile\` = ?)
      AND \`password\` = MD5(?)
    `;

    pool.query(sql, [username, username, password], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: "Incorrect password or username" }, null);
      }

      callback(null, results);
    });
  },

  updateToken: (id, token, tokenExpiry, callback) => {
    const sql = `
      UPDATE \`branches\`
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
              "Token update failed. Branch not found or no changes made.",
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
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback({ message: "Branch not found" }, null);
      }

      callback(null, results);
    });
  },

  // Clear login token and token expiry
  logout: (id, callback) => {
    const sql = `
        UPDATE \`branches\`
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
            message: "Token clear failed. Branch not found or no changes made.",
          },
          null
        );
      }

      callback(null, results);
    });
  },
  findById: (id, callback) => {
    const sql = `
      SELECT \`id\`, \`emp_id\`, \`name\`, \`profile_picture\`, \`email\`, \`mobile\`, \`permissions\`, \`status\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;
    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }
      if (results.length === 0) {
        return callback({ message: "Branch not found" }, null);
      }
      callback(null, results[0]); // Return the first result (should be one result if ID is unique)
    });
  },
};

module.exports = Branch;
