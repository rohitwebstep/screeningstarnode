const crypto = require("crypto");
const pool = require("../../config/db");

// Generates a new random token
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Returns the expiry time for the token (1 hour from now)
const getTokenExpiry = () => new Date(Date.now() + 3600000).toISOString();

const common = {
  /**
   * Validates the admin's token and refreshes it if expired.
   * @param {string} _token - Provided token
   * @param {number} admin_id - Admin ID
   * @param {function} callback - Callback function
   */
  isAdminTokenValid: (_token, admin_id, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const sql = `
      SELECT \`login_token\`, \`token_expiry\`
      FROM \`admins\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [admin_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ status: false, message: "Database error" }, null);
      }

      if (results.length === 0) {
        return callback({ status: false, message: "Admin not found" }, null);
      }

      const currentToken = results[0].login_token;
      const tokenExpiry = new Date(results[0].token_expiry);
      const currentTime = new Date();

      if (_token !== currentToken) {
        return callback(
          { status: false, message: "Invalid token provided" },
          null
        );
      }

      if (tokenExpiry > currentTime) {
        callback(null, { status: true, message: "Token is valid" });
      } else {
        const newToken = generateToken();
        const newTokenExpiry = getTokenExpiry();

        const updateSql = `
          UPDATE \`admins\`
          SET \`login_token\` = ?, \`token_expiry\` = ?
          WHERE \`id\` = ?
        `;

        pool.query(
          updateSql,
          [newToken, newTokenExpiry, admin_id],
          (updateErr) => {
            if (updateErr) {
              console.error("Error updating token:", updateErr);
              return callback(
                { status: false, message: "Error updating token" },
                null
              );
            }

            callback(null, {
              status: true,
              message: "Token was expired and has been refreshed",
              newToken,
            });
          }
        );
      }
    });
  },

  /**
   * Logs admin login activities.
   * @param {number} admin_id - Admin ID
   * @param {string} action - Action performed
   * @param {string} result - Result of the action
   * @param {string} error - Error message if any
   * @param {function} callback - Callback function
   */
  adminLoginLog: (admin_id, action, result, error, callback) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const insertSql = `
      INSERT INTO \`admin_login_logs\` (\`admin_id\`, \`action\`, \`result\`, \`error\`, \`created_at\`)
      VALUES (?, ?, ?, ?, NOW())
    `;

    pool.query(insertSql, [admin_id, action, result, error], (err) => {
      if (err) {
        console.error("Database insertion error:", err);
        return callback({ status: false, message: "Database error" }, null);
      }

      callback(null, {
        status: true,
        message: "Admin login log entry added successfully",
      });
    });
  },

  /**
   * Logs other admin activities.
   * @param {number} admin_id - Admin ID
   * @param {string} module - Module name
   * @param {string} action - Action performed
   * @param {string} result - Result of the action
   * @param {string} update - Update description
   * @param {string} error - Error message if any
   * @param {function} callback - Callback function
   */
  adminActivityLog: (
    admin_id,
    module,
    action,
    result,
    update,
    error,
    callback
  ) => {
    if (typeof callback !== "function") {
      console.error("Callback is not a function");
      return;
    }

    const insertSql = `
      INSERT INTO \`admin_activity_logs\` (\`admin_id\`, \`module\`, \`action\`, \`result\`, \`update\`, \`error\`, \`created_at\`)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    pool.query(
      insertSql,
      [admin_id, module, action, result, update, error],
      (err) => {
        if (err) {
          console.error("Database insertion error:", err);
          return callback({ status: false, message: "Database error" }, null);
        }
        callback(null, {
          status: true,
          message: "Admin activity log entry added successfully",
        });
      }
    );
  },

  isAdminAuthorizedForAction: (admin_id, action, callback) => {
    const sql = `
      SELECT \`permissions\`
      FROM \`admins\`
      WHERE \`id\` = ?
    `;

    pool.query(sql, [admin_id], (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return callback({ status: false, message: "Database query error" });
      }
      if (results.length === 0) {
        return callback({ status: false, message: "Admin not found" });
      }

      const permissionsJson = JSON.parse(results[0].permissions);
      const permissions =
        typeof permissionsJson === "string"
          ? JSON.parse(permissionsJson)
          : permissionsJson;

      const actionObj =
        typeof action === "string" ? JSON.parse(action) : action;

      // Extract action type and action name from the action object
      const [actionType, actionName] = Object.entries(actionObj)[0] || [];

      // Check if action type and action name are valid
      if (!actionType || !actionName) {
        console.error("Invalid action format");
        return callback({ status: false, message: "Invalid action format" });
      }

      // Check if the action type exists in the permissions object
      if (!permissions[actionType]) {
        console.error("Action type not found in permissions");
        return callback({
          status: false,
          message: "Action type not found in permissions",
        });
      }

      // Check if the action name is authorized
      const isAuthorized = permissions[actionType][actionName] === true;

      return callback({
        permissions,
        actionObj,
        actionType,
        actionName,
        isAuthorized,
        status: isAuthorized,
        message: isAuthorized
          ? "Action is authorized"
          : "Action is not authorized",
      });
    });
  },
};

module.exports = common;
