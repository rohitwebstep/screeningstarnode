const pool = require("../../../config/db");

const Branch = {
  findByEmailOrMobile: (username, callback) => {
    const sql = `
      SELECT \`id\`, \`customer_id\`, \`name\`, \`email\`, \`status\`, \`login_token\`, \`token_expiry\`
      FROM \`branches\`
      WHERE \`email\` = ?
    `;

    pool.query(sql, [username], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback(
          { message: "No branch found with the provided email" },
          null
        );
      }

      callback(null, results);
    });
  },

  findByEmailOrMobileAllInfo: (username, callback) => {
    const sql = `
      SELECT \`id\`, \`customer_id\`, \`name\`, \`email\`, \`status\`, \`login_token\`, \`token_expiry\`
      FROM \`branches\`
      WHERE \`email\` = ?
    `;

    pool.query(sql, [username], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Database query error", error: err }, null);
      }

      if (results.length === 0) {
        return callback(
          { message: "No branch found with the provided email" },
          null
        );
      }

      callback(null, results);
    });
  },

  setResetPasswordToken: (id, token, tokenExpiry, callback) => {
    const sql = `
      UPDATE \`branches\`
      SET \`reset_password_token\` = ?, \`password_token_expiry\` = ?
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
            message: "Token update failed. Branch not found or no changes made.",
          },
          null
        );
      }

      callback(null, results);
    });
  },

  validatePassword: (email, password, callback) => {
    const sql = `
      SELECT \`id\`
      FROM \`branches\`
      WHERE \`email\` = ?
      AND (\`password\` = MD5(?) OR \`password\` = ?)
    `;

    pool.query(sql, [email, password, password], (err, results) => {
      if (err) {
        console.error("Database query failed:", err);
        return callback({ message: "Internal server error", error: err }, null);
      }

      // Return true if a match is found, otherwise return false
      if (results.length > 0) {
        return callback(null, true);
      } else {
        return callback(null, false);
      }
    });
  },

  updatePassword: (new_password, branch_id, callback) => {
    const sql = `UPDATE \`branches\` SET \`password\` = MD5(?) WHERE \`id\` = ?`;

    pool.query(sql, [new_password, branch_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err.message);
        return callback(
          {
            message: "An error occurred while updating the password.",
            error: err,
          },
          null
        );
      }

      // Check if the branch_id was found and the update affected any rows
      if (results.affectedRows === 0) {
        return callback(
          {
            message:
              "Branch not found or password not updated. Please check the provided details.",
          },
          null
        );
      }

      callback(null, {
        message: "Password updated successfully.",
        affectedRows: results.affectedRows,
      });
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
      SELECT \`login_token\`, \`token_expiry\`
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
      SELECT \`id\`, \`name\`, \`email\`, \`permissions\`, \`status\`
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

  isBranchActive: (id, callback) => {
    const sql = `
      SELECT \`status\`
      FROM \`branches\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Internal server error", error: err }, null);
      }

      // If no customer is found, return appropriate message
      if (results.length === 0) {
        return callback(
          { message: "No branch found with the provided ID" },
          null
        );
      }

      const status = results[0].status;

      // Check if status is either string "1" or number 1
      const isActive = status == 1; // using loose equality (==) to handle both types
      callback(null, isActive);
    });
  },

  isCustomerActive: (customerID, callback) => {
    const sql = `
      SELECT \`status\`
      FROM \`customers\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [customerID], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ message: "Internal server error", error: err }, null);
      }

      // If no customer is found, return appropriate message
      if (results.length === 0) {
        return callback(
          { message: "No customer found with the provided ID" },
          null
        );
      }

      const status = results[0].status;

      // Check if status is either string "1" or number 1
      const isActive = status == 1; // using loose equality (==) to handle both types
      callback(null, isActive);
    });
  },
};

module.exports = Branch;
